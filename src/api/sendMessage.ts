import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ids, requireMember } from '../server/chat';
import { loadCommunity } from '../server/community';
import { parseChannel, permsOf, timedOutUntil } from '../lib/community';

const reject = (msg: string) => { const e = new ZiteError(msg); e.userFacingMessage = msg; return e; };

/** Announcement channels, slow mode and auto-moderation for community channels. */
async function enforceRules(communityId: string, rawChannel: unknown, cid: string, me: string, body: string) {
  const { s, ownerId } = await loadCommunity(communityId);
  const ch = parseChannel(rawChannel);
  const perms = permsOf(s, ownerId, me);
  const until = timedOutUntil(s, me);
  if (until) throw reject(`You’re timed out in this community until ${new Date(until).toUTCString().slice(5, 22)} UTC.`);
  if (ch.announcement && !perms.has('postAnnouncements')) throw reject('Only certain roles can post in this announcement channel.');
  if (/@everyone\b/i.test(body) && !perms.has('mentionEveryone')) throw reject('You don’t have permission to use @everyone here.');
  if (perms.has('bypassSlowmode')) return;
  if (body.length > s.maxLength) throw reject(`Messages here can be at most ${s.maxLength} characters.`);
  if (s.blockLinks && /(https?:\/\/|www\.)\S+/i.test(body)) throw reject('Links aren’t allowed in this community.');
  const lower = body.toLowerCase();
  if (s.bannedWords.some((w) => w && lower.includes(w))) throw reject('Your message contains a word this community has blocked.');
  if (ch.slowmode > 0) {
    const r = await zite.sql({
      query: `SELECT MAX(m.created_at) AS last FROM "Messages" m JOIN "ConversationsMessages" l ON l."messagesId" = m.id
              WHERE l."conversationsId" = $1::uuid AND m."sender"->>0 = $2`,
      params: [cid, me],
    });
    const last = r.rows[0]?.last ? new Date(String(r.rows[0].last)).getTime() : 0;
    const wait = Math.ceil((last + ch.slowmode * 1000 - Date.now()) / 1000);
    if (wait > 0) throw reject(`Slow mode is on — you can send again in ${wait}s.`);
  }
}

export default createEndpoint({
  description: 'Sends a message (with optional files), optionally as a thread reply or a quoted reply',
  authenticated: true,
  inputSchema: z.object({
    conversationId: z.string(),
    body: z.string().max(5000),
    attachments: z.array(z.object({ url: z.string(), filename: z.string() })).max(10).optional(),
    parentMessageId: z.string().optional(),
    replyToId: z.string().optional(),
    poll: z.object({ question: z.string().min(1).max(300), options: z.array(z.string().min(1).max(120)).min(2).max(10), multi: z.boolean() }).optional(),
  }),
  outputSchema: z.object({ id: z.string(), sentAt: z.string() }),
  execute: async ({ input, context }) => {
    const body = input.body.trim();
    const files = input.attachments ?? [];
    if (!body && !files.length && !input.poll) throw new ZiteError('Empty message');
    const me = context.user.id;
    const cid = input.conversationId;

    // Access checks run together instead of one after another.
    const [conv] = await Promise.all([
      requireMember(cid, me),
      input.parentMessageId && zite.messages.findOne({ id: input.parentMessageId }).then((p) => {
        if (!p || !ids(p.conversation).includes(cid)) throw new ZiteError('Thread not found');
      }),
    ]);
    if (conv.communityId) await enforceRules(conv.communityId, conv.settings, cid, me, body);
    if (!conv.isGroup) {
      // Direct messages are refused if either person has blocked the other.
      const other = ids(conv.members).find((m) => m !== me);
      if (other) {
        const b = await zite.sql({ query: `SELECT 1 FROM "Profiles" WHERE ("userKey" = $1 AND "blocked" @> jsonb_build_array($2::text)) OR ("userKey" = $2 AND "blocked" @> jsonb_build_array($1::text)) LIMIT 1`, params: [me, other] });
        if (b.rows.length) throw reject('You can’t message this person.');
      }
    }
    // Spam protection: too many messages in a burst, or the same text repeated.
    const recent = await zite.sql({
      query: `SELECT m."body", m.created_at FROM "Messages" m JOIN "ConversationsMessages" l ON l."messagesId" = m.id
              WHERE l."conversationsId" = $1::uuid AND m."sender" @> jsonb_build_array($2::text) AND m.created_at > now() - interval '30 seconds' ORDER BY m.created_at DESC LIMIT 8`,
      params: [cid, me],
    });
    const inTen = recent.rows.filter((r) => Date.now() - new Date(String(r.created_at)).getTime() < 10_000).length;
    if (inTen >= 6) throw reject('Slow down a little — you’re sending messages very quickly.');
    if (body && body.length > 3 && recent.rows.filter((r) => String(r.body ?? '') === body).length >= 2) throw reject('Looks like you already sent that — try saying something new.');
    const ttl = Number((conv as { disappearAfter?: number | null }).disappearAfter ?? 0);

    const now = new Date().toISOString();
    const who = context.user.firstName || context.user.email.split('@')[0];
    const what = body || (input.poll ? `📊 ${input.poll.question}` : '') || `sent ${files.length > 1 ? `${files.length} files` : 'a file'}`;
    const preview = (input.parentMessageId ? `${who} replied in a thread: ${what}` : body || input.poll ? `${who}: ${what}` : `${who} ${what}`).slice(0, 140);

    // The message, the conversation's preview, the sender's read marker and clearing "typing…" all write in parallel.
    const [msg] = await Promise.all([
      zite.messages.create({
        record: {
          body, conversation: cid, sender: me, attachments: files.length ? files : null, reactions: null,
          parentMessageId: input.parentMessageId ?? null, replyToId: input.replyToId ?? null, editedAt: null,
          poll: input.poll ? JSON.stringify({ ...input.poll, votes: {} }) : null,
          expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null,
        } as never,
      }),
      zite.conversations.update({ id: cid, record: { lastMessageAt: now, lastMessagePreview: preview, archivedBy: [] } as never }),
      input.parentMessageId ? null : zite.readReceipts.bulkCreate({
        records: [{ key: `${cid}:${me}`, conversation: cid, reader: me, lastReadAt: now }], matchOn: ['key'],
      }),
      zite.presence.bulkCreate({ records: [{ userKey: me, person: me, lastSeenAt: now, typingIn: null, typingAt: null } as never], matchOn: ['userKey'] }),
    ]);
    return { id: msg.id, sentAt: now };
  },
});
