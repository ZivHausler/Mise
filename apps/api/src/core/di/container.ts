import { createContainer as createAwilixContainer, asClass, asValue, InjectionMode } from 'awilix';
import type { AwilixContainer } from 'awilix';
import { InMemoryEventBus } from '../events/event-bus.js';

export interface AppContainer extends AwilixContainer {
  resolve(name: 'eventBus'): InMemoryEventBus;
}

export function createContainer(): AppContainer {
  const container = createAwilixContainer({
    injectionMode: InjectionMode.CLASSIC,
    strict: true,
  });

  // Register the shared event bus so all modules use the same instance
  const eventBus = new InMemoryEventBus();
  container.register({
    eventBus: asValue(eventBus),
  });

  return container as AppContainer;
}
