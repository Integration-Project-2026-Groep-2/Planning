import { getChannel } from '../rabbitmq';
import { parseStringPromise } from 'xml2js';
import { z } from 'zod';
import { query } from '../db';
import { validateXml } from '../utils/xml.validator';

const CompanyConfirmedSchema = z.object({
  crmMasterId: z.string().uuid(),
  companyName: z.string().min(1),
});

export const startCompanyConfirmedConsumer = async () => {
  const channel = getChannel();
  const queue = 'crm.company.confirmed';
  const dlq = 'crm.company.confirmed.dlq';

  await channel.assertQueue(queue, { durable: true });
  await channel.assertQueue(dlq, { durable: true });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();

      if (!validateXml(xml, 'CompanyConfirmed')) {
        console.error('[CRM] Ongeldige XML in crm.company.confirmed');
        channel.sendToQueue(dlq, Buffer.from(xml), {
          contentType: 'application/xml',
          persistent: true,
        });
        channel.ack(msg);
        return;
      }

      const parsed = await parseStringPromise(xml);
      const data = parsed.CompanyConfirmed;

      const payload = {
        crmMasterId: data.crmMasterId?.[0].trim(),
        companyName: data.companyName?.[0] ?? data.name?.[0].trim(),
      };

      const validated = CompanyConfirmedSchema.safeParse(payload);
      if (!validated.success) {
        console.error(
          '[CRM] Zod validatie mislukt in crm.company.confirmed:',
          validated.error.flatten()
        );
        channel.sendToQueue(dlq, Buffer.from(xml), {
          contentType: 'application/xml',
          persistent: true,
        });
        channel.ack(msg);
        return;
      }

      await query(
        `UPDATE "Speaker"
         SET "company" = $1
         WHERE "crmMasterId" = $2`,
        [validated.data.companyName, validated.data.crmMasterId]
      );

      console.log('[CRM] Company opgeslagen in Speaker');

      channel.ack(msg);
    } catch (error) {
      console.error('[CRM] Error company confirmed:', error);
      channel.nack(msg, false, false);
    }
  });
};