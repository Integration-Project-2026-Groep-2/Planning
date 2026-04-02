import { getChannel } from '../rabbitmq';
 
export const startHeartbeatProducer = () => {
  setInterval(() => {
    sendHeartbeat();
  }, 1000);
};
 
const sendHeartbeat = async () => {
  try {
    const channel = getChannel();
    const exchange = 'heartbeat.direct';
    const routingKey = 'routing.heartbeat';
 
    await channel.assertExchange(exchange, 'direct', { durable: true });
 
    const timestamp = new Date().toISOString();
    const heartbeatMessage = `<?xml version="1.0" encoding="UTF-8"?>
<Heartbeat>
  <serviceId>planning</serviceId>
  <timestamp>${timestamp}</timestamp>
</Heartbeat>`;
 
    channel.publish(exchange, routingKey, Buffer.from(heartbeatMessage), {
      contentType: 'application/xml',
      persistent: true,
    });
 
    console.log(`[Heartbeat] Bericht verzonden op ${timestamp}`);
 
  } catch (error) {
    console.error('[Heartbeat] Fout bij het verzonden:', error);
  }
};