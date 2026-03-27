import { getChannel } from '../rabbitmq';
import { parseStringPromise } from 'xml2js';
import { query } from '../db';

export const startUserConfirmedConsumer = async () => {
  const channel = getChannel();
  const queue = 'crm.user.confirmed';

  await channel.assertQueue(queue, { durable: true });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();
      const data = await parseStringPromise(xml);

      const user = data.UserConfirmed;

      if (user.role?.[0] !== 'SPEAKER') {
        channel.ack(msg);
        return;
      }

      const crmMasterId = user.crmMasterId?.[0];

      const existingSpeaker = await query(
        `SELECT "speakerId" FROM "Speaker" WHERE "crmMasterId" = $1`,
        [crmMasterId]
      );

      if (existingSpeaker.rows.length === 0) {
        await query(
          `INSERT INTO "Speaker"
          ("crmMasterId", "firstName", "lastName", "email", "phoneNumber", "company", "isActive")
          VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [
            crmMasterId,
            user.firstName?.[0],
            user.lastName?.[0],
            user.email?.[0],
            user.phoneNumber?.[0],
            user.company?.[0],
          ]
        );

        console.log('[CRM] Speaker toegevoegd');
      } else {
        console.log('[CRM] Speaker bestaat al, overslaan');
      }

      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Error confirmed:', err);
      channel.nack(msg, false, false);
    }
  });
};