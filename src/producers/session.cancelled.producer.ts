import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionCancelledPayload = {
  sessionId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
};

export const sendSessionCancelled = async (payload: SessionCancelledPayload) => {
  try {
    const channel = getChannel();
    const queueName = 'planning.session.cancelled';

    await channel.assertQueue(queueName, { durable: true });

    const xml = buildXml('SessionCancelled', {
      sessionId: payload.sessionId,
      title: payload.title,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      reason: payload.reason ?? undefined,
    });

    const isValid = validateXml(xml, 'SessionCancelled');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionCancelled');
      return;
    }

    channel.sendToQueue(queueName, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionCancelled verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionCancelled:', error);
  }
};