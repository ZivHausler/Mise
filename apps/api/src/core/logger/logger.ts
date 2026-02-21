import pino from 'pino';
import type { PinoLoggerOptions } from 'fastify/types/logger.js';
import { env } from '../../config/env.js';

export const logger: PinoLoggerOptions = {
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
    req(request: unknown) {
      const req = request as Record<string, unknown>;
      return {
        method: req['method'],
        url: req['url'],
        hostname: req['hostname'],
        remoteAddress: req['ip'],
      };
    },
  },
};

/** Standalone Pino instance for use outside Fastify (DI container, event bus, etc.) */
export const appLogger = pino(logger);
