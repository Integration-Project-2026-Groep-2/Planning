import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type ParticipantRegisteredPayload = {
  sessionId: string;
  participantId: string;
};

export const sendParticipantRegistered = async (
  payload: ParticipantRegisteredPayload
) => {
  try {
    const channel = getChannel();
    const queueName = 'planning.participant.registered';

    await channel.assertQueue(queueName, { durable: true });

    const xml = buildXml('ParticipantRegistered', {
      sessionId: payload.sessionId,
      participantId: payload.participantId,
    });

    const isValid = validateXml(xml, 'ParticipantRegistered');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor ParticipantRegistered');
      return;
    }

    channel.sendToQueue(queueName, Buffer.from(xml), {
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