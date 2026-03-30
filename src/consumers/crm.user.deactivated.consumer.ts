import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { query } from '../db';

const schema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  deactivatedAt: z.string(),
});

export const startUserDeactivatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue = 'crm.user.deactivated';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.user.deactivated');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();
      const data = await parseXml(xml, 'UserDeactivated');

      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        console.error('[CRM] Zod validatie mislukt:', parsed.error.flatten());
        channel.ack(msg);
        return;
      }

      const user = parsed.data;

      await query(
        `UPDATE "Speaker"
         SET "isActive" = false
         WHERE "crmMasterId" = $1`,
        [user.id]
      );

      console.log('[CRM] Speaker gedeactiveerd');
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout:', err);
    }
  });
};