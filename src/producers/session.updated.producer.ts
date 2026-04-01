import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionUpdatedPayload = {
  sessionId: string;
  changeType:
    | 'TITLE_CHANGED'
    | 'LOCATION_CHANGED'
    | 'TIME_CHANGED'
    | 'CAPACITY_CHANGED'
    | 'SPEAKER_CHANGED';
  newTime?: string;
  newLocation?: string;
  newTitle?: string;
  newCapacity?: number;
  ingeschrevenDeelnemers?: string[];
  timestamp?: string;
};

export const sendSessionUpdated = async (payload: SessionUpdatedPayload) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.session.updated';
    const routingKey = 'planning.session.updated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('SessionUpdated', {
      sessionId: payload.sessionId,
      changeType: payload.changeType,
      newTime: payload.newTime,
      newLocation: payload.newLocation,
      newTitle: payload.newTitle,
      newCapacity: payload.newCapacity,
      ingeschrevenDeelnemers: payload.ingeschrevenDeelnemers?.length
        ? { crmMasterId: payload.ingeschrevenDeelnemers }
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