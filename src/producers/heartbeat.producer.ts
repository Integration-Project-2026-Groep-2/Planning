import { getChannel } from '../rabbitmq';

export const startHeartbeatProducer = () => {
  
};

const sendHeartbeat = async () => {
  try {
    const channel = getChannel();
    const queueName = 'planning.heartbeat';

    await channel.assertQueue(queueName, { durable: true });
    
  } catch (error) {
    console.error('[Heartbeat] Fout bij het verzenden:', error);
  }
};
