import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type SessionFullPayload = {
  sessionId: string;
  title: string;
  capacity: number;
};

export const sendSessionFull = async (payload: SessionFullPayload) => {
  try {
    const channel = getChannel();
    const queueName = 'planning.session.full';

    await channel.assertQueue(queueName, { durable: true });

    const xml = buildXml('SessionFull', {
      sessionId: payload.sessionId,
      title: payload.title,
      capacity: payload.capacity,
    });

    const isValid = validateXml(xml, 'SessionFull');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor SessionFull');
      return;
    }

    channel.sendToQueue(queueName, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] SessionFull verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden SessionFull:', error);
  }
};