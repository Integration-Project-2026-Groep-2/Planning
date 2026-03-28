import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionRescheduledPayload = {
  sessionId: string;
  title: string;
  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  reason?: string;
};

export const sendSessionRescheduled = async (payload: SessionRescheduledPayload) => {
  try {
    const channel = getChannel();
    const queueName = 'planning.session.rescheduled';

    await channel.assertQueue(queueName, { durable: true });

    const xml = buildXml('SessionRescheduled', {
      sessionId: payload.sessionId,
      title: payload.title,
      oldDate: payload.oldDate,
      oldStartTime: payload.oldStartTime,
      oldEndTime: payload.oldEndTime,
      newDate: payload.newDate,
      newStartTime: payload.newStartTime,
      newEndTime: payload.newEndTime,
      reason: payload.reason ?? undefined,
    });

    const isValid = validateXml(xml, 'SessionRescheduled');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionRescheduled');
      return;
    }

    channel.sendToQueue(queueName, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionRescheduled verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionRescheduled:', error);
  }
};