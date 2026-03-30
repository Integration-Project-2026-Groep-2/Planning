import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionUpdateCrmPayload = {
  sessionId: string;
  sessionName: string;
  newTime?: string;
  newLocation?: string;
  changeType: 'rescheduled' | 'cancelled' | 'updated';
};

export const sendSessionUpdateToCrm = async (
  payload: SessionUpdateCrmPayload
) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.session.updated';
    const routingKey = 'planning.session.updated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('SessionUpdate', {
      sessionId: payload.sessionId,
      sessionName: payload.sessionName,
      newTime: payload.newTime,
      newLocation: payload.newLocation,
      changeType: payload.changeType,
    });

    const isValid = validateXml(xml, 'SessionUpdate');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionUpdate');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionUpdate naar CRM verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionUpdate naar CRM:', error);
  }
};