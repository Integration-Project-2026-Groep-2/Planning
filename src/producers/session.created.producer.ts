import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { log } from '../utils/logger';

type SessionCreatedPayload = {
  sessionId:  string;
  title:      string;
  date:       string;
  startTime:  string;
  endTime:    string;
  location:   string;
  capacity:   number;
  status:     'active' | 'cancelled' | 'full' | 'concept';
  icsData:    string;   
  timestamp?: string;
};

export const sendSessionCreated = async (payload: SessionCreatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.session.created';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('SessionCreated', {
      sessionId: payload.sessionId,
      title:     payload.title,
      date:      payload.date,
      startTime: payload.startTime,
      endTime:   payload.endTime,
      location:  payload.location,
      status:    payload.status,
      capacity:  payload.capacity,
      icsData:   payload.icsData,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionCreated');
    if (!isValid) {
      log.error('[Producer] Ongeldige XML voor SessionCreated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    log.info('[Producer] SessionCreated verzonden');
  } catch (error) {
    log.error('[Producer] Fout bij verzenden SessionCreated:', error);
  }
};