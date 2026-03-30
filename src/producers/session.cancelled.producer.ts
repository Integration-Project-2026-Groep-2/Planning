import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionCancelledPayload = {
  sessionId: string;
  status?: 'cancelled';
  reason?: string;
  ingeschrevenDeelnemers?: string[];
  timestamp?: string;
};

export const sendSessionCancelled = async (
  payload: SessionCancelledPayload
) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.session.cancelled';

    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

    const xml = buildXml('SessionCancelled', {
      sessionId: payload.sessionId,
      status: payload.status ?? 'cancelled',
      reason: payload.reason,
      ingeschrevenDeelnemers: payload.ingeschrevenDeelnemers?.length
        ? { crmMasterId: payload.ingeschrevenDeelnemers }
        : undefined,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionCancelled');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionCancelled');
      return;
    }

    channel.publish(exchangeName, '', Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionCancelled verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionCancelled:', error);
  }
};