import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ids } from '../server/chat';

export default createEndpoint({
  description: 'Edits the text of one of the signed-in user’s own messages',
  authenticated: true,
  inputSchema: z.object({ messageId: z.string(), body: z.string().min(1).max(5000) }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    const msg = await zite.messages.findOne({ id: input.messageId });
    if (!msg) throw new ZiteError('Message not found');
    if (!ids(msg.sender).includes(context.user.id)) throw new ZiteError('You can only edit your own messages');
    await zite.messages.update({ id: input.messageId, record: { body: input.body.trim(), editedAt: new Date().toISOString() } });
    return { ok: true };
  },
});
