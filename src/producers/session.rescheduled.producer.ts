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
  ingeschrevenDeelnemers?: string[];
  timestamp?: string;
};

export const sendSessionRescheduled = async (
  payload: SessionRescheduledPayload
) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.session.rescheduled';

    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

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
      ingeschrevenDeelnemers: payload.ingeschrevenDeelnemers?.length
        ? { crmMasterId: payload.ingeschrevenDeelnemers }
        : undefined,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionRescheduled');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionRescheduled');
      return;
    }

    channel.publish(exchangeName, '', Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionRescheduled verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionRescheduled:', error);
  }
};