import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { log } from '../utils/logger';

type LocationDeletedPayload = {
  locationId: string;
  timestamp?: string;
};

export const sendLocationDeleted = async (payload: LocationDeletedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.location.deleted';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('LocationDeleted', {
      locationId: payload.locationId,
      timestamp:  payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'LocationDeleted');
    if (!isValid) {
      log.error('[Producer] Ongeldige XML voor LocationDeleted');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    log.info('[Producer] LocationDeleted verzonden');
  } catch (error) {
    log.error('[Producer] Fout bij verzenden LocationDeleted:', error);
  }
};