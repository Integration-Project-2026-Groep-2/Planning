import { getChannel } from '../rabbitmq';
import { parseStringPromise } from 'xml2js';
import { query } from '../db';
import { validateXml } from '../utils/xml.validator';

export const startUserUpdatedConsumer = async () => {
  const channel = getChannel();
  const queue = 'crm.user.updated';
  const dlq = 'crm.user.updated.dlq';

  await channel.assertQueue(queue, { durable: true });
  await channel.assertQueue(dlq, { durable: true });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();

      const isValid = validateXml(xml, 'UserUpdated');
      if (!isValid) {
        console.error('[CRM] Ongeldige XML in crm.user.updated');
        channel.sendToQueue(dlq, Buffer.from(xml), {
          contentType: 'application/xml',
          persistent: true,
        });
        channel.ack(msg);
        return;
      }

      const data = await parseStringPromise(xml);
      const user = data.UserUpdated;

      await query(
        `UPDATE "Speaker"
         SET "firstName" = $1,
             "lastName" = $2,
             "email" = $3,
             "phoneNumber" = $4,
             "company" = $5
         WHERE "crmMasterId" = $6`,
        [
          user.firstName?.[0],
          user.lastName?.[0],
          user.email?.[0],
          user.phoneNumber?.[0],
          user.company?.[0],
          user.crmMasterId?.[0],
        ]
      );

      console.log('[CRM] Speaker geüpdatet');

      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Error updated:', err);
      channel.nack(msg, false, false);
    }
  });
};