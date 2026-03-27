import 'dotenv/config';
import express from 'express';
import { connectRabbitMQ } from './rabbitmq';
import { startHeartbeatProducer } from './producers';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'planning' });
});

app.use('/api', routes);

const start = async () => {
  await connectRabbitMQ();
  startHeartbeatProducer();
  app.listen(PORT, () => {
    console.log(`Planning service running on port ${PORT}`);
  });
};

start();

export default app;
