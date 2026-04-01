import { getChannel } from '../rabbitmq';
import { z } from 'zod';
import { query } from '../db';
import { parseXml } from '../utils/xml.parser';

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
  const queue = 'crm.company.confirmed';

  const dlx = 'contact.dlq';
  const dlq = 'crm.company.confirmed.dlq';
  const dlqRoutingKey = 'crm.company.confirmed.dlq';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertExchange(dlx, 'topic', { durable: true });

  await channel.assertQueue(queue, { durable: true });
  await channel.assertQueue(dlq, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.company.confirmed');
  await channel.bindQueue(dlq, dlx, dlqRoutingKey);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const xml = msg.content.toString();

    try {
      const data = await parseXml(xml, 'CompanyConfirmed');
      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        console.error(
          '[CRM] Zod validatie mislukt in crm.company.confirmed:',
          parsed.error.flatten()
        );

        channel.publish(dlx, dlqRoutingKey, Buffer.from(xml), {
          contentType: 'application/xml',
          persistent: true,
        });

        channel.ack(msg);
        return;
      }

      const company = parsed.data;

      await query(
        `UPDATE "Speaker"
         SET "company" = $1,
             "isActive" = $2
         WHERE "crmMasterId" = $3`,
        [company.name, company.isActive, company.id]
      );

      console.log('[CRM] Company opgeslagen in Speaker');
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout in crm.company.confirmed:', err);

      channel.publish(dlx, dlqRoutingKey, Buffer.from(xml), {
        contentType: 'application/xml',
        persistent: true,
      });

      channel.ack(msg);
    }
  });
};