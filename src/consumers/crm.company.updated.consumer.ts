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
  email: z.string().email().optional(),
  phone: z.string().optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  isActive: z.preprocess(toBoolean, z.boolean()),
  updatedAt: z.string(),
});

export const startCompanyUpdatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue = 'crm.company.updated';
  const dlq = 'crm.company.updated.dlq';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.assertQueue(dlq, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.company.updated');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();
      const data = await parseXml(xml, 'CompanyUpdated');

      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        console.error(
          '[CRM] Zod validatie mislukt in crm.company.updated:',
          parsed.error.flatten()
        );
        channel.sendToQueue(dlq, Buffer.from(xml), {
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

      console.log('[CRM] Company geüpdatet in Speaker');
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout in crm.company.updated:', err);
      channel.nack(msg, false, false);
    }
  });
};