import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { log } from '../utils/logger';

type SpeakerCreatedPayload = {
  speakerId:    string;
  firstName:    string;
  lastName:     string;
  email:        string;
  phoneNumber?: string;
  company?:     string;
  isActive:     boolean;
  timestamp?:   string;
};

export const sendSpeakerCreated = async (payload: SpeakerCreatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.speaker.created';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('SpeakerCreated', {
      speakerId:   payload.speakerId,
      firstName:   payload.firstName,
      lastName:    payload.lastName,
      email:       payload.email,
      phoneNumber: payload.phoneNumber,
      company:     payload.company,
      isActive:    payload.isActive,
      timestamp:   payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SpeakerCreated');
    if (!isValid) {
      log.error('[Producer] Ongeldige XML voor SpeakerCreated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    log.info('[Producer] SpeakerCreated verzonden');
  } catch (error) {
    log.error('[Producer] Fout bij verzenden SpeakerCreated:', error);
  }
};