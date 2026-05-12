import { getChannel } from '../rabbitmq';
import { buildXml } from '../utils/xml.builder';
import { validateXml } from '../utils/xml.validator';
import { log } from '../utils/logger';

type LocationUpdatedPayload = {
  locationId: string;
  roomName:   string;
  capacity:   number;
  address?:   string;
  status:     string;
  timestamp?: string;
};

export const sendLocationUpdated = async (payload: LocationUpdatedPayload) => {
  try {
    const channel      = getChannel();
    const exchangeName = 'planning.topic';
    const routingKey   = 'planning.location.updated';

    await channel.assertExchange(exchangeName, 'topic', { durable: true });

    const xml = buildXml('LocationUpdated', {
      locationId: payload.locationId,
      roomName:   payload.roomName,
      capacity:   payload.capacity,
      address:    payload.address,
      status:     payload.status,
      timestamp:  payload.timestamp ?? new Date().toISOString(),
    });

    const isValid = validateXml(xml, 'LocationUpdated');
    if (!isValid) {
      log.error('[Producer] Ongeldige XML voor LocationUpdated');
      return;
    }

    channel.publish(exchangeName, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent:  true,
    });

    log.info('[Producer] LocationUpdated verzonden');
  } catch (error) {
    log.error('[Producer] Fout bij verzenden LocationUpdated:', error);
  }
};