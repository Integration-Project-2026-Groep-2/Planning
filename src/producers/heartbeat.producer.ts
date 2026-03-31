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
    const routingKey = 'planning.heartbeat';
 
    await channel.assertExchange(exchange, 'direct', { durable: true });
 
    const timestamp = new Date().toISOString();
    const heartbeatMessage = `<Heartbeat>
  <serviceId>planning</serviceId>
  <timestamp>${timestamp}</timestamp>
  <status>healthy</status>
  <dbOk>true</dbOk>
  <rabbitmqOk>true</rabbitmqOk>
  <outlookOk>true</outlookOk>
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