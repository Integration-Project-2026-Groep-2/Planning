import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { log } from '../utils/logger';

type SpeakerDeactivatedPayload = {
  speakerId:      string;
  email:          string;
  deactivatedAt?: string;
};

export const sendSpeakerDeactivated = async (payload: SpeakerDeactivatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.speaker.deactivated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('SpeakerDeactivated', {
      speakerId:     payload.speakerId,
      email:         payload.email,
      deactivatedAt: payload.deactivatedAt ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SpeakerDeactivated');
    if (!isValid) {
      log.error('[Producer] Ongeldige XML voor SpeakerDeactivated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    log.info('[Producer] SpeakerDeactivated verzonden');
  } catch (error) {
    log.error('[Producer] Fout bij verzenden SpeakerDeactivated:', error);
  }
};