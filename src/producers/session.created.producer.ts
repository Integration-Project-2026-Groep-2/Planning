import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionCreatedPayload = {
  sessionId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  status: 'active' | 'cancelled' | 'full' | 'concept';
  timestamp?: string;
};

export const sendSessionCreated = async (payload: SessionCreatedPayload) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.session.created';

    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

    const xml = buildXml('SessionCreated', {
      sessionId: payload.sessionId,
      title: payload.title,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      location: payload.location,
      status: payload.status,
      capacity: payload.capacity,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionCreated');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionCreated');
      return;
    }

    channel.publish(exchangeName, '', Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionCreated verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionCreated:', error);
  }
};