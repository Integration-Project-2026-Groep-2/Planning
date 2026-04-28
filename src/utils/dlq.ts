import { getChannel } from '../rabbitmq';

export const sendToDlq = async (
  originalMessage: string,
  reason: string,
  originalRoutingKey?: string,
  retryCount?: number
) => {
  try {
    const channel = getChannel();
    const dlqExchange = 'planning.dlq';
    const dlqQueue = 'planning.dlq.queue';

    await channel.assertExchange(dlqExchange, 'topic', { durable: true });
    await channel.assertQueue(dlqQueue, { durable: true });
    await channel.bindQueue(dlqQueue, dlqExchange, '#');

    channel.publish(dlqExchange, 'planning.dlq', Buffer.from(originalMessage), {
      headers: {
        'x-error': reason,
        'x-retry-count': retryCount ?? 0,
        'x-original-routing-key': originalRoutingKey ?? 'unknown',
        'x-service': 'planning',
      },
      persistent: true,
    });

    console.error(`[DLQ] Bericht naar DLQ gestuurd: ${reason}`);
  } catch (error) {
    console.error('[DLQ] Fout bij sturen naar DLQ:', error);
  }
};