import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type RegistrationConfirmedPayload = {
  registrationId: string;
  sessionId:      string;
  crmMasterId:    string;
  timestamp?:     string;
};

export const sendRegistrationConfirmed = async (
  payload: RegistrationConfirmedPayload
) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.registration.confirmed';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('RegistrationConfirmed', {
      registrationId: payload.registrationId,
      sessionId:      payload.sessionId,
      crmMasterId:    payload.crmMasterId,
      timestamp:      payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = await validateXml(xml, 'RegistrationConfirmed');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor RegistrationConfirmed');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    console.log('[Producer] RegistrationConfirmed verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden RegistrationConfirmed:', error);
  }
};
