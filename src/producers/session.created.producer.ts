import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionCreatedPayload = {
  sessionId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string | null;
  capacity: number;
  status: string;
};

export const sendSessionCreated = async (payload: SessionCreatedPayload) => {
  try {
    const channel = getChannel();
    const queueName = 'planning.session.created';

    await channel.assertQueue(queueName, { durable: true });

    const xml = buildXml('SessionCreated', {
      sessionId: payload.sessionId,
      title: payload.title,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      locationId: payload.locationId ?? undefined,
      capacity: payload.capacity,
      status: payload.status,
    });

    const isValid = validateXml(xml, 'SessionCreated');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionCreated');
      return;
    }

    channel.sendToQueue(queueName, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionCreated verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionCreated:', error);
  }
};