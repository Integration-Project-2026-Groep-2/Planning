import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { log } from '../utils/logger';

type SpeakerUpdatedPayload = {
  speakerId:    string;
  firstName:    string;
  lastName:     string;
  email:        string;
  phoneNumber?: string;
  companyId?:   string;
  isActive:     boolean;
  timestamp?:   string;
};

export const sendSpeakerUpdated = async (payload: SpeakerUpdatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.speaker.updated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('SpeakerUpdated', {
      speakerId:   payload.speakerId,
      firstName:   payload.firstName,
      lastName:    payload.lastName,
      email:       payload.email,
      phoneNumber: payload.phoneNumber,
      companyId:   payload.companyId,
      isActive:    payload.isActive,
      timestamp:   payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'SpeakerUpdated');
    if (!isValid) {
      log.error('[Producer] Ongeldige XML voor SpeakerUpdated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    log.info('[Producer] SpeakerUpdated verzonden');
  } catch (error) {
    log.error('[Producer] Fout bij verzenden SpeakerUpdated:', error);
  }
};