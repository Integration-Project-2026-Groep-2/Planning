import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { log } from '../utils/logger';

type PlanningUserDeactivatedPayload = {
  id:    string;
  email: string;
};

export const sendPlanningUserDeactivated = async (payload: PlanningUserDeactivatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'user.topic';
    const routingKey   = 'planning.user.deactivated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('PlanningUserDeactivated', {
      id:            payload.id,
      email:         payload.email,
      deactivatedAt: new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'PlanningUserDeactivated');
    if (!isValid) {
      log.error('[Producer] Ongeldige XML voor PlanningUserDeactivated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    log.info('[Producer] PlanningUserDeactivated verzonden');
  } catch (error) {
    log.error('[Producer] Fout bij verzenden PlanningUserDeactivated:', error);
  }
};
