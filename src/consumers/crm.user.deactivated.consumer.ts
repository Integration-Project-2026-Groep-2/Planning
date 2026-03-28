import { getChannel } from '../rabbitmq';
import { parseStringPromise } from 'xml2js';
import { query } from '../db';
import { validateXml } from '../utils/xml.validator';

export const startUserDeactivatedConsumer = async () => {
  const channel = getChannel();
  const queue = 'crm.user.deactivated';
  const dlq = 'crm.user.deactivated.dlq';

  await channel.assertQueue(queue, { durable: true });
  await channel.assertQueue(dlq, { durable: true });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();

      const isValid = validateXml(xml, 'UserDeactivated');
      if (!isValid) {
        console.error('[CRM] Ongeldige XML in crm.user.deactivated');
        channel.sendToQueue(dlq, Buffer.from(xml), {
          contentType: 'application/xml',
          persistent: true,
        });
        channel.ack(msg);
        return;
      }

      const data = await parseStringPromise(xml);
      const user = data.UserDeactivated;

      await query(
        `UPDATE "Speaker"
         SET "isActive" = false
         WHERE "crmMasterId" = $1`,
        [user.crmMasterId?.[0]]
      );

      console.log('[CRM] Speaker gedeactiveerd');

      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Error deactivated:', err);
      channel.nack(msg, false, false);
    }
  });
};