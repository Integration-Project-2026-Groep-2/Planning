import { getChannel } from '../rabbitmq';

type SessionErrorPayload = {
  errorType:
    | 'VALIDATION_ERROR'
    | 'OUTLOOK_SYNC_FAILED'
    | 'DATABASE_ERROR'
    | 'RABBITMQ_ERROR'
    | 'CONFLICT_ERROR'
    | 'NOT_FOUND'
    | 'IDEMPOTENCY_VIOLATION'
    | 'UNKNOWN_ERROR';
  message: string;
  sessionId?: string;
};

export const sendSessionError = async (payload: SessionErrorPayload) => {
  try {
    const channel = getChannel();
    const exchange = 'planning.topic';
    const routingKey = 'planning.session.error';

    await channel.assertExchange(exchange, 'topic', { durable: true });

    const timestamp = new Date().toISOString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SessionError>
  <errorType>${payload.errorType}</errorType>
  <message>${payload.message}</message>
  ${payload.sessionId ? `<sessionId>${payload.sessionId}</sessionId>` : ''}
  <service>planning</service>
  <timestamp>${timestamp}</timestamp>
</SessionError>`;

    channel.publish(exchange, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });

    console.error(`[SessionError] ${payload.errorType}: ${payload.message}`);
  } catch (error) {
    console.error('[SessionError] Fout bij verzenden error event:', error);
  }
};