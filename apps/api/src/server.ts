import Fastify from 'fastify';

import { env } from './config/env.js';
import { registerCorePlugins } from './core/plugins.js';
import { createContainer } from './core/di/container.js';
import { registerModules } from './modules/index.js';
import { globalErrorHandler } from './core/errors/error-handler.js';
import { logger } from './core/logger/logger.js';
import { postgresClient } from './core/database/postgres.js';
import { mongoClient } from './core/database/mongodb.js';
import { sanitizeMiddleware } from './core/middleware/sanitize.js';
import { RabbitMQEventBus } from './core/events/rabbitmq-event-bus.js';
import { RedisCacheClient } from './core/cache/redis-client.js';
import { setTokenBlacklistClient } from './core/auth/token-blacklist.js';

async function bootstrap() {
  const app = Fastify({
    logger: logger,
    disableRequestLogging: true,
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
    bodyLimit: 1048576, // 1MB max body size
  });

  // Global error handler
  app.setErrorHandler(globalErrorHandler);

  // Register core plugins (CORS, helmet, rate limiting, JWT, etc.)
  await registerCorePlugins(app);

  // Global input sanitization to prevent NoSQL injection
  app.addHook('preHandler', sanitizeMiddleware);

  // Connect to databases
  try {
    await postgresClient.connect();
    app.log.info('PostgreSQL connected');
  } catch (err) {
    app.log.fatal({ err }, 'PostgreSQL connection failed — cannot start without PG');
    process.exit(1);
  }

  try {
    await mongoClient.connect();
    app.log.info('MongoDB connected');
  } catch (err) {
    app.log.warn({ err }, 'MongoDB connection failed — running without Mongo');
  }

  // Create DI container and decorate Fastify instance
  const container = await createContainer();
  app.decorate('container', container);

  // Initialize token blacklist with Redis cache client
  const cacheClient = container.resolve('cacheClient');
  setTokenBlacklistClient(cacheClient);

  // Register all feature modules (this sets up event subscribers)
  await registerModules(app);

  // If using RabbitMQ, bind queues for all subscribers registered during module init
  const eventBus = container.resolve('eventBus');
  if (eventBus instanceof RabbitMQEventBus) {
    try {
      await eventBus.setupSubscribers();
      app.log.info('RabbitMQ subscribers bound');
    } catch (err) {
      app.log.error({ err }, 'Failed to set up RabbitMQ subscribers — events may not be processed');
    }
  }

  // Health check — dependency-aware, returns 503 if PostgreSQL is down
  app.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {};

    try {
      await postgresClient.query('SELECT 1');
      checks['postgres'] = 'ok';
    } catch {
      checks['postgres'] = 'down';
    }

    try {
      const mongoHealthy = await mongoClient.isHealthy();
      checks['mongo'] = mongoHealthy ? 'ok' : 'down';
    } catch {
      checks['mongo'] = 'down';
    }

    const cacheClient = container.resolve('cacheClient');
    if (cacheClient) {
      try {
        await cacheClient.get('health:ping');
        checks['redis'] = 'ok';
      } catch {
        checks['redis'] = 'down';
      }
    } else {
      checks['redis'] = 'not configured';
    }

    const isHealthy = checks['postgres'] === 'ok';
    const status = isHealthy ? 'ok' : 'degraded';

    reply.code(isHealthy ? 200 : 503);
    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  });

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      const bus = container.resolve('eventBus');
      if (bus instanceof RabbitMQEventBus) {
        await bus.close();
        app.log.info('RabbitMQ disconnected');
      }
      const cache = container.resolve('cacheClient');
      if (cache instanceof RedisCacheClient) {
        await cache.disconnect();
        app.log.info('Redis disconnected');
      }
      await postgresClient.disconnect();
      await mongoClient.disconnect();
      process.exit(0);
    });
  }

  // Start server
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
