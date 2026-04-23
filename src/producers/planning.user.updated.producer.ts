import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';

type PlanningUserUpdatedPayload = {
  id:           string;
  email:        string;
  firstName:    string;
  lastName:     string;
  phoneNumber?: string;
  company?:     string;
};

export const sendPlanningUserUpdated = async (payload: PlanningUserUpdatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'user.topic';
    const routingKey   = 'planning.user.updated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('PlanningUserUpdated', {
      id:          payload.id,
      email:       payload.email,
      firstName:   payload.firstName,
      lastName:    payload.lastName,
      role:        'SPEAKER',
      isActive:    'true',
      phoneNumber: payload.phoneNumber,
      company:     payload.company,
    });

    const isValid = validateXml(xml, 'PlanningUserUpdated');
    if (!isValid) {
      console.error('[Producer] Ongeldige XML voor PlanningUserUpdated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    console.log('[Producer] PlanningUserUpdated verzonden');
  } catch (error) {
    console.error('[Producer] Fout bij verzenden PlanningUserUpdated:', error);
  }
};
