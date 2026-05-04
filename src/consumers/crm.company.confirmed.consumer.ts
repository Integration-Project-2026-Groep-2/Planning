import { getChannel } from '../rabbitmq';
import { z } from 'zod';
import { query } from '../db';
import { parseXml } from '../utils/xml.parser';
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
  vatNumber: z.string().regex(/^BE[0-9]{10}$/),
  name: z.string(),
  email: z.string().email(),
  isActive: z.preprocess(toBoolean, z.boolean()),
  confirmedAt: z.string(),
});

export const startCompanyConfirmedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue = 'planning.company.confirmed';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.company.confirmed');

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

      const data = await parseXml(xml, 'CompanyConfirmed');
      const company = schema.parse(data);

      await query(
        `UPDATE "Speaker"
         SET "company" = $1,
             "isActive" = $2
         WHERE "crmMasterId" = $3`,
        [company.name, company.isActive, company.id]
      );

      await markAsProcessed(messageId);
      console.log('[CRM] Company opgeslagen in Speaker');
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout in crm.company.confirmed:', err);

      await sendToDlq(
         xml, 
         err instanceof Error ? err.message : 'Unknown error', 
         'crm.company.confirmed'
      );

      channel.ack(msg);
    }
  });
};