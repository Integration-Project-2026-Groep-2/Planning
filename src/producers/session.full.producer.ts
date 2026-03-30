import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionFullPayload = {
  sessionId: string;
  currentRegistrations: number;
  capacity: number;
  crmMasterId?: string;
  timestamp?: string;
};

export const sendSessionFull = async (payload: SessionFullPayload) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.session.full';

    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

    const xml = buildXml('SessionFull', {
      sessionId: payload.sessionId,
      currentRegistrations: payload.currentRegistrations,
      capacity: payload.capacity,
      crmMasterId: payload.crmMasterId,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionFull');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionFull');
      return;
    }

    channel.publish(exchangeName, '', Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionFull verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionFull:', error);
  }
};