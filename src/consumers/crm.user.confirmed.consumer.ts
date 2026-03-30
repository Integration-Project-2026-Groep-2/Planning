import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { query } from '../db';

const toBoolean = (value: unknown) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

const schema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  role: z.string(),
  isActive: z.preprocess(toBoolean, z.boolean()),
  gdprConsent: z.preprocess(toBoolean, z.boolean()),
  confirmedAt: z.string(),
});

export const startUserConfirmedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue = 'crm.user.confirmed';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'crm.user.confirmed');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();
      const data = await parseXml(xml, 'UserConfirmed');

      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        console.error('[CRM] Zod validatie mislukt:', parsed.error.flatten());
        channel.ack(msg);
        return;
      }

      const user = parsed.data;

      if (user.role !== 'SPEAKER') {
        console.log('[CRM] Geen speaker → genegeerd');
        channel.ack(msg);
        return;
      }

      const existingSpeaker = await query(
        `SELECT "speakerId"
         FROM "Speaker"
         WHERE "crmMasterId" = $1
         LIMIT 1`,
        [user.id]
      );

      if (existingSpeaker.rowCount && existingSpeaker.rowCount > 0) {
        console.log('[CRM] Speaker bestaat al → geen insert');
        channel.ack(msg);
        return;
      }

      await query(
        `INSERT INTO "Speaker"
        ("crmMasterId", "firstName", "lastName", "email", "phoneNumber", "isActive")
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          user.firstName,
          user.lastName,
          user.email,
          user.phone || null,
          user.isActive,
        ]
      );

      console.log('[CRM] Speaker aangemaakt');
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout:', err);
      channel.ack(msg);
    }
  });
};