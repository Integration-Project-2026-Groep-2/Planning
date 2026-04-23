import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionUpdatedPayload = {
  sessionId: string;
  sessionName: string;
  changeType: 'rescheduled' | 'cancelled' | 'updated';
  newTime?: string;
  newLocation?: string;
  participantIds?: string[];
  timestamp?: string;
};

export const sendSessionUpdated = async (payload: SessionUpdatedPayload) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey = 'planning.session.updated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('SessionUpdated', {
      sessionId: payload.sessionId,
      sessionName: payload.sessionName,
      changeType: payload.changeType,
      newTime: payload.newTime,
      newLocation: payload.newLocation,
      participantIds: payload.participantIds?.length
        ? { participantId: payload.participantIds }
        : undefined,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionUpdated');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionUpdated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionUpdated verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionUpdated:', error);
  }
};