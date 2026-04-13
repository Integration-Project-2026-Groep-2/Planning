import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type ParticipantRegisteredPayload = {
  sessionId: string;
  crmMasterId: string;
  currentRegistrations: number;
  capacity: number;
  registrationTime?: string;
  timestamp?: string;
};

export const sendParticipantRegistered = async (
  payload: ParticipantRegisteredPayload
) => {
  try {
    const channel = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey = 'planning.participant.registered';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('ParticipantRegistered', {
      sessionId: payload.sessionId,
      crmMasterId: payload.crmMasterId,
      currentRegistrations: payload.currentRegistrations,
      capacity: payload.capacity,
      registrationTime: payload.registrationTime ?? new Date().toISOString(),
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'ParticipantRegistered');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor ParticipantRegistered');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log('[Producer] ParticipantRegistered verzonden');
  } catch (error) {
    console.error(
      '[Producer] Fout bij verzenden ParticipantRegistered:',
      error
    );
  }
};