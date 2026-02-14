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

async function bootstrap() {
  const app = Fastify({
    logger: logger,
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
    app.log.warn({ err }, 'PostgreSQL connection failed — running without PG');
  }

  try {
    await mongoClient.connect();
    app.log.info('MongoDB connected');
  } catch (err) {
    app.log.warn({ err }, 'MongoDB connection failed — running without Mongo');
  }

  // Create DI container and decorate Fastify instance
  const container = createContainer();
  app.decorate('container', container);

  // Register all feature modules
  await registerModules(app);

  // Health check — minimal info, no internal details
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      await app.close();
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
