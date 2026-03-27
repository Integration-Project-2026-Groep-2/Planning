import { getChannel } from '../rabbitmq';

export const startHeartbeatProducer = () => {
  
};

const sendHeartbeat = async () => {
  try {
    const channel = getChannel();
    
  } catch (error) {
    console.error('[Heartbeat] Fout bij het verzenden:', error);
  }
};
