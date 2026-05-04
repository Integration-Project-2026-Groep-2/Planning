import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { query } from '../db';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import crypto from 'crypto';

const schema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  deactivatedAt: z.string(),
});

export const startUserDeactivatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue = 'planning.user.deactivated';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.user.deactivated');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const xml = msg.content.toString();
    const messageId = msg.properties.messageId || crypto.randomUUID();

    try {
      const alreadyProcessed = await isAlreadyProcessed(messageId);
      if (alreadyProcessed) {
        channel.ack(msg);
        return;
      }

      const data = await parseXml(xml, 'UserDeactivated');
      const user = schema.parse(data);

      await query(
        `UPDATE "Speaker"
         SET "isActive" = false
         WHERE "crmMasterId" = $1`,
        [user.id]
      );

      await markAsProcessed(messageId);
      console.log('[CRM] Speaker gedeactiveerd');
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout in crm.user.deactivated:', err);

      await sendToDlq(
        xml, 
        err instanceof Error ? err.message : 'Unknown error', 
        'crm.user.deactivated'
      );

      channel.ack(msg);
    }
  });
};