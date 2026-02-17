import { createContainer as createAwilixContainer, asValue, InjectionMode } from 'awilix';
import type { AwilixContainer } from 'awilix';
import { InMemoryEventBus, setEventBus } from '../events/event-bus.js';
import type { EventBus } from '../events/event-bus.js';
import { RabbitMQEventBus } from '../events/rabbitmq-event-bus.js';
import type { CacheClient } from '../cache/redis.js';
import { RedisCacheClient } from '../cache/redis-client.js';
import { env } from '../../config/env.js';

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

  try {
    const rabbitBus = new RabbitMQEventBus(env.RABBITMQ_URL);
    await rabbitBus.connect();
    eventBus = rabbitBus;
    console.log('RabbitMQ event bus connected');
  } catch (err) {
    console.warn('RabbitMQ connection failed, falling back to InMemoryEventBus:', err);
    eventBus = new InMemoryEventBus();
  }

  let cacheClient: CacheClient | null = null;

  try {
    const redis = new RedisCacheClient();
    await redis.connect();
    cacheClient = redis;
    console.log('Redis connected');
  } catch (err) {
    console.warn('Redis connection failed, running without cache:', err);
  }

  setEventBus(eventBus);

  container.register({
    eventBus: asValue(eventBus),
    cacheClient: asValue(cacheClient),
  });

  return container as AppContainer;
}
