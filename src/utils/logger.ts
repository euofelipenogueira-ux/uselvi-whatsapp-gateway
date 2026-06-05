import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';

const pinoLogger = pino({
  level: logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export function createLogger(name: string) {
  return pinoLogger.child({ component: name });
}
