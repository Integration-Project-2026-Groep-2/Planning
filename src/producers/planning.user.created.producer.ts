import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type PlanningUserCreatedPayload = {
  id:           string;
  email:        string;
  firstName:    string;
  lastName:     string;
  phoneNumber?: string;
  company?:     string;
};

export const sendPlanningUserCreated = async (payload: PlanningUserCreatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'user.topic';
    const routingKey   = 'planning.user.created';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('PlanningUserCreated', {
      id:          payload.id,
      email:       payload.email,
      firstName:   payload.firstName,
      lastName:    payload.lastName,
      role:        'SPEAKER',
      gdprConsent: 'true',
      phoneNumber: payload.phoneNumber,
      company:     payload.company,
    });

    const isValid = validateXml(xml, 'PlanningUserCreated');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor PlanningUserCreated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    console.log('[Producer] PlanningUserCreated verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden PlanningUserCreated:', error);
  }
};
