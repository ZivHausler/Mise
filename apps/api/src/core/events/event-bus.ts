export interface DomainEvent {
  eventName: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  correlationId?: string;
}

export type EventHandler = (event: DomainEvent) => Promise<void>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}

let _eventBus: EventBus | null = null;

export function setEventBus(bus: EventBus): void {
  _eventBus = bus;
}

export function getEventBus(): EventBus {
  if (!_eventBus) {
    throw new Error('EventBus not initialized. Call setEventBus() during startup.');
  }
  return _eventBus;
}

/**
 * In-memory event bus for V1.
 * Can be swapped for RabbitMQ/Redis Streams implementation later.
 */
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>();

  async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventName) ?? [];
    await Promise.allSettled(eventHandlers.map((handler) => handler(event)));
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }
}
