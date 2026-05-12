import { sendLog, type LogLevel } from '../producers/log.producer';

type LogInput = string | Error | unknown;

const stringify = (input: LogInput): string => {
  if (input instanceof Error) {
    return input.stack ? `${input.message}\n${input.stack}` : input.message;
  }
  if (typeof input === 'string') return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
};

const emit = (level: LogLevel, consoleMethod: (...args: unknown[]) => void, args: unknown[]): void => {
  consoleMethod(...args);
  const data = args.map(a => stringify(a)).join(' ');
  sendLog(level, data);
};

export const log = {
  debug: (...args: unknown[]) => emit('DEBUG', console.debug, args),
  info:  (...args: unknown[]) => emit('INFO',  console.log,   args),
  warn:  (...args: unknown[]) => emit('WARN',  console.warn,  args),
  error: (...args: unknown[]) => emit('ERROR', console.error, args),
  fatal: (...args: unknown[]) => emit('FATAL', console.error, args),
};
