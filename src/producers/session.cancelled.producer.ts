import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { generateIcsBase64 } from '../utils/ics.generator';

type SessionCancelledPayload = {
  sessionId:       string;
  sessionName:     string;
  date:            string;
  startTime:       string;
  endTime:         string;
  location?:       string;
  description?:    string;
  status?:         'cancelled';
  reason?:         string;
  participantIds?: string[];
  timestamp?:      string;
};

export const sendSessionCancelled = async (payload: SessionCancelledPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.session.cancelled';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const icsData = generateIcsBase64({
      sessionId:   payload.sessionId,
      title:       payload.sessionName,
      date:        payload.date,
      startTime:   payload.startTime,
      endTime:     payload.endTime,
      location:    payload.location,
      description: payload.description,
    });

    const xml = buildXml('SessionCancelled', {
      sessionId:      payload.sessionId,
      sessionName:    payload.sessionName,
      status:         payload.status ?? 'cancelled',
      reason:         payload.reason,
      participantIds: payload.participantIds?.length
        ? { participantId: payload.participantIds }
        : undefined,
      icsData,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionCancelled');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionCancelled');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    console.log('[Producer] SessionCancelled verzonden (met ICS CANCELLED)');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionCancelled:', error);
  }
};