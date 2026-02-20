import pino from 'pino';
import { env } from '../../config/env.js';

export const logger = {
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true,
          },
        }
      : undefined,
  serializers: {
    req(request: Record<string, unknown>) {
      return {
        method: request['method'],
        url: request['url'],
        hostname: request['hostname'],
        remoteAddress: request['ip'],
      };
    },
  },
};

/** Standalone Pino instance for use outside Fastify (DI container, event bus, etc.) */
export const appLogger = pino(logger);
