import { getChannel } from '../rabbitmq';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'PANIC';

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const sendLog = (level: LogLevel, data: string): void => {
  try {
    const channel = getChannel();
    const exchange = 'logs.direct';
    const routingKey = 'routing.log';

    const timestamp = new Date().toISOString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LogEvent>
  <level>${level}</level>
  <timestamp>${timestamp}</timestamp>
  <service>planning</service>
  <data>${escapeXml(data)}</data>
</LogEvent>`;

    channel.publish(exchange, routingKey, Buffer.from(xml), {
      contentType: 'application/xml',
      persistent: true,
    });
  } catch {
    // Swallowed: caller (logger util) has already mirrored to console.
    // Re-throwing or logging here would risk self-recursion.
  }
};
