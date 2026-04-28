import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { generateIcsBase64 } from '../utils/ics.generator';

type SessionUpdatedPayload = {
  sessionId:       string;
  sessionName:     string;
  changeType:      'rescheduled' | 'cancelled' | 'updated';
  // datum + tijden nodig voor ICS aanmaken
  date?:           string;
  startTime?:      string;
  endTime?:        string;
  newTime?:        string;
  newLocation?:    string;
  description?:    string;
  participantIds?: string[];
  timestamp?:      string;
};

export const sendSessionUpdated = async (payload: SessionUpdatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.session.updated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    let icsData: string | undefined;
    if (payload.date && payload.startTime && payload.endTime) {
      icsData = generateIcsBase64({
        sessionId:   payload.sessionId,
        title:       payload.sessionName,
        date:        payload.date,
        startTime:   payload.startTime,
        endTime:     payload.endTime,
        location:    payload.newLocation,
        description: payload.description,
      });
    }

    const xml = buildXml('SessionUpdated', {
      sessionId:      payload.sessionId,
      sessionName:    payload.sessionName,
      changeType:     payload.changeType,
      newTime:        payload.newTime,
      newLocation:    payload.newLocation,
      participantIds: payload.participantIds?.length
        ? { participantId: payload.participantIds }
        : undefined,
      icsData,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SessionUpdated');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionUpdated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    console.log('[Producer] SessionUpdated verzonden (met ICS)');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionUpdated:', error);
  }
};