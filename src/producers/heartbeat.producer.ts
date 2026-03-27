import { getChannel } from '../rabbitmq';

export const startHeartbeatProducer = () => {
  
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
    
  } catch (error) {
    console.error('[Heartbeat] Fout bij het verzenden:', error);
  }
};
