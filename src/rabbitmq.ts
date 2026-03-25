import 'dotenv/config';
import amqp from 'amqplib';

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  channel = await connection.createChannel();
  console.log('RabbitMQ connected');
  return channel;
};

export const getChannel = () => {
  if (!channel) throw new Error('RabbitMQ not connected yet');
  return channel;
};