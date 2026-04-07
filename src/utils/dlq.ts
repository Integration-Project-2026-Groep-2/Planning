import { getChannel } from '../rabbitmq';

export const sendToDlq = async (
  originalMessage: string,
  reason: string
) => {
  try {
    const channel = getChannel();
    const dlqName = 'planning.dlq';

    await channel.assertQueue(dlqName, { durable: true });

    channel.sendToQueue(dlqName, Buffer.from(originalMessage), {
      headers: { error_reason: reason },
      persistent: true,
    });

    console.error(`[DLQ] Bericht naar DLQ gestuurd: ${reason}`);
  } catch (error) {
    console.error('[DLQ] Fout bij sturen naar DLQ:', error);
  }
};