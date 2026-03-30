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
  updatedAt: z.string(),
});

export const startUserUpdatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue = 'crm.user.updated';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.user.updated');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();
      const data = await parseXml(xml, 'UserUpdated');

      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        console.error('[CRM] Zod validatie mislukt:', parsed.error.flatten());
        return;
      }

      const user = parsed.data;

      await query(
        `UPDATE "Speaker"
         SET "firstName"=$1,
             "lastName"=$2,
             "email"=$3,
             "phoneNumber"=$4,
             "isActive"=$5
         WHERE "crmMasterId"=$6`,
        [
          user.firstName,
          user.lastName,
          user.email,
          user.phone || null,
          user.isActive,
          user.id,
        ]
      );

      console.log('[CRM] Speaker geüpdatet');
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout:', err);
    }
  });
};