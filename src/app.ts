import 'dotenv/config';
import express from 'express';
import { connectRabbitMQ } from './rabbitmq';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'planning' });
});

const start = async () => {
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log(`Planning service running on port ${PORT}`);
  });
};

start();

export default app;