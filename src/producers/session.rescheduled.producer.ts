import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionRescheduledPayload = {
  sessionId: string;
  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  newLocation?: string;
  reason?: string;
  participantIds?: string[];
  timestamp?: string;
};

export const sendSessionRescheduled = async (
  payload: SessionRescheduledPayload
) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey = 'planning.session.rescheduled';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('SessionRescheduled', {
      sessionId: payload.sessionId,
      oldDate: payload.oldDate,
      oldStartTime: payload.oldStartTime,
      oldEndTime: payload.oldEndTime,
      newDate: payload.newDate,
      newStartTime: payload.newStartTime,
      newEndTime: payload.newEndTime,
      newLocation: payload.newLocation,
      reason: payload.reason,
      participantIds: payload.participantIds?.length
        ? { participantId: payload.participantIds }
        : undefined,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionRescheduled');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionRescheduled');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionRescheduled verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionRescheduled:', error);
  }
};