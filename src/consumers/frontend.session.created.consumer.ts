import { Channel, ConsumeMessage } from 'amqplib';
import { parseXml } from '../utils/xml.parser';
import { validateXml } from '../utils/xml.validator';
import { createSession } from '../services/session.service';

const QUEUE = 'frontend.session.created';
const EXCHANGE = 'planning.topic';
const ROUTING_KEY = 'planning.session.created';
const DLQ = 'frontend.session.created.dlq';

export async function startFrontendSessionCreatedConsumer(channel: Channel) {
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true, deadLetterExchange: DLQ });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  channel.consume(QUEUE, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();
      const isValid = validateXml(xml, 'SessionCreated');
      if (!isValid) throw new Error('XML validatie mislukt');

      const parsed = await parseXml(xml);
      const session = parsed.SessionCreated;

      await createSession({
        sessionId: session.sessionId[0],
        title: session.title[0],
        date: session.date[0],
        startTime: session.startTime[0],
        endTime: session.endTime[0],
        location: session.location[0],
        status: session.status[0],
        capacity: parseInt(session.capacity[0]),
      });

      logger.info({ queue: QUEUE }, 'Sessie aangemaakt via frontend consumer');
      channel.ack(msg);
    } catch (err) {
      logger.error({ queue: QUEUE, err }, 'Fout bij verwerken bericht');
      channel.nack(msg, false, false); // naar DLQ
    }
  });
}