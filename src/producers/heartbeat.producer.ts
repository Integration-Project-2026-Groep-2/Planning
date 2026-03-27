import { getChannel } from '../rabbitmq';

export const startHeartbeatProducer = () => {
  setInterval(() => {
    sendHeartbeat();
  }, 1000);
};

const sendHeartbeat = async () => {
  try {
    const channel = getChannel();
    const queueName = 'planning.heartbeat';

    await channel.assertQueue(queueName, { durable: true });

    const timestamp = new Date().toISOString();
    const heartbeatMessage = `<Heartbeat>
  <serviceId>planning</serviceId>
  <timestamp>${timestamp}</timestamp>
  <status>healthy</status>
  <dbOk>true</dbOk>
  <rabbitmqOk>true</rabbitmqOk>
  <outlookOk>true</outlookOk>
</Heartbeat>`;

    channel.sendToQueue(queueName, Buffer.from(heartbeatMessage), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.log(`[Heartbeat] Bericht verzonden op ${timestamp}`);
    
  } catch (error) {
    console.error('[Heartbeat] Fout bij het verzenden:', error);
  }
};
