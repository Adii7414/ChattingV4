import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ids, requireMember } from '../server/chat';

export default createEndpoint({
  description: 'Adds or removes the signed-in user’s emoji reaction on a message',
  authenticated: true,
  inputSchema: z.object({ conversationId: z.string(), messageId: z.string(), emoji: z.string().min(1).max(16) }),
  outputSchema: z.object({ reacted: z.boolean() }),
  execute: async ({ input, context }) => {
    await requireMember(input.conversationId, context.user.id);
    const msg = await zite.messages.findOne({ id: input.messageId });
    if (!msg || !ids(msg.conversation).includes(input.conversationId)) throw new Error('Message not found');

    const key = `${input.messageId}:${context.user.id}:${input.emoji}`;
    const existing = await zite.reactions.findOne({ filters: { key } });
    if (existing) {
      await zite.reactions.delete({ id: existing.id });
      return { reacted: false };
    }
    await zite.reactions.create({
      record: { key, emoji: input.emoji, message: input.messageId, reactor: context.user.id, conversation: input.conversationId },
    });
    return { reacted: true };
  },
});
