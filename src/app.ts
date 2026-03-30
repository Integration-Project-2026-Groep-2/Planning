import 'dotenv/config';
import express from 'express';
import { connectRabbitMQ } from './rabbitmq';
import { startHeartbeatProducer } from './producers';
import routes from './routes';
import {
  startUserConfirmedConsumer,
  startUserUpdatedConsumer,
  startUserDeactivatedConsumer,
  startCompanyConfirmedConsumer,
  startCompanyUpdatedConsumer,
  startCompanyDeactivatedConsumer,
} from './consumers';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'planning' });
});

app.use('/api', routes);

const start = async () => {
  try {
    await connectRabbitMQ();
    startHeartbeatProducer();
    await startUserConfirmedConsumer();
    await startUserUpdatedConsumer();
    await startUserDeactivatedConsumer();
  } catch (err) {
    console.warn('RabbitMQ niet bereikbaar — service start zonder RabbitMQ');
  }

  await startCompanyConfirmedConsumer();
  await startCompanyUpdatedConsumer();
  await startCompanyDeactivatedConsumer();

  app.listen(PORT, () => {
    console.log(`Planning service running on port ${PORT}`);
  });
};

start();

export default app;