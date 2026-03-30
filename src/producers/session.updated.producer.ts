import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionUpdatedPayload = {
  sessionId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string | null;
  capacity: number;
  status: string;
};

export const sendSessionUpdated = async (payload: SessionUpdatedPayload) => {
  try {
    const channel = getChannel();
    const queueName = 'planning.session.updated';

    await channel.assertQueue(queueName, { durable: true });

    const xml = buildXml('SessionUpdated', {
      sessionId: payload.sessionId,
      title: payload.title,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      locationId: payload.locationId ?? undefined,
      capacity: payload.capacity,
      status: payload.status,
    });

    const isValid = validateXml(xml, 'SessionUpdated');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionUpdated');
      return;
    }

    channel.sendToQueue(queueName, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionUpdated verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionUpdated:', error);
  }
};