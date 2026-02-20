import { createContainer as createAwilixContainer, asValue, InjectionMode } from 'awilix';
import type { AwilixContainer } from 'awilix';
import { InMemoryEventBus, setEventBus } from '../events/event-bus.js';
import type { EventBus } from '../events/event-bus.js';
import { RabbitMQEventBus } from '../events/rabbitmq-event-bus.js';
import type { CacheClient } from '../cache/redis.js';
import { RedisCacheClient } from '../cache/redis-client.js';
import { env } from '../../config/env.js';
import { appLogger } from '../logger/logger.js';

export interface AppContainer extends AwilixContainer {
  resolve(name: 'eventBus'): EventBus;
  resolve(name: 'cacheClient'): CacheClient | null;
}

export async function createContainer(): Promise<AppContainer> {
  const container = createAwilixContainer({
    injectionMode: InjectionMode.CLASSIC,
    strict: true,
  });

  let eventBus: EventBus;
  const rabbitBus = new RabbitMQEventBus(env.RABBITMQ_URL);

  try {
    await rabbitBus.connect();
    eventBus = rabbitBus;
    appLogger.info('RabbitMQ event bus connected');
  } catch (err) {
    appLogger.warn({ err }, 'RabbitMQ connection failed, falling back to InMemoryEventBus');
    try {
      await rabbitBus.close();
    } catch {
      // Ignore cleanup errors
    }
    eventBus = new InMemoryEventBus();
  }

  let cacheClient: CacheClient | null = null;
  const redis = new RedisCacheClient();

  try {
    await redis.connect();
    cacheClient = redis;
    appLogger.info('Redis connected');
  } catch (err) {
    appLogger.warn({ err }, 'Redis connection failed, running without cache');
    try {
      await redis.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  }

  setEventBus(eventBus);

  container.register({
    eventBus: asValue(eventBus),
    cacheClient: asValue(cacheClient),
  });

  return container as AppContainer;
}
