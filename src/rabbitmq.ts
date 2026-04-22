import 'dotenv/config';
import amqp from 'amqplib';

let channel: amqp.Channel;

export const connectRabbitMQ = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      channel = await connection.createChannel();
      console.log('RabbitMQ connected');
      return channel;
    } catch (err) {
      console.log(`RabbitMQ connectie mislukt, poging ${i + 1}/${retries}. Opnieuw proberen in ${delay/1000}s...`);
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

export const getChannel = () => {
  if (!channel) throw new Error('RabbitMQ not connected yet');
  return channel;
};

export const publishMessage = async (routingKey: string, message: any) => {
  const ch = getChannel();

  const exchange = 'user.topic';

  await ch.assertExchange(exchange, 'topic', { durable: true });

  ch.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
};