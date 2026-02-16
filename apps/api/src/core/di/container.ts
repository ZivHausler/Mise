import { createContainer as createAwilixContainer, asValue, InjectionMode } from 'awilix';
import type { AwilixContainer } from 'awilix';
import { InMemoryEventBus } from '../events/event-bus.js';
import type { EventBus } from '../events/event-bus.js';
import { RabbitMQEventBus } from '../events/rabbitmq-event-bus.js';
import { env } from '../../config/env.js';

export interface AppContainer extends AwilixContainer {
  resolve(name: 'eventBus'): EventBus;
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

  container.register({
    eventBus: asValue(eventBus),
  });

  return container as AppContainer;
}
