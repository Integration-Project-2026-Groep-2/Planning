import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { query } from '../db';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import crypto from 'crypto';

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
  const queue = 'planning.user.updated';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.user.updated');

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

      const data = await parseXml(xml, 'UserUpdated');
      const user = schema.parse(data);

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

      await markAsProcessed(messageId);
      console.log('[CRM] Speaker geüpdatet');
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout in crm.user.updated:', err);

      await sendToDlq(
        xml, 
        err instanceof Error ? err.message : 'Unknown error', 
        'crm.user.updated'
      );

      channel.ack(msg);
    }
  });
};