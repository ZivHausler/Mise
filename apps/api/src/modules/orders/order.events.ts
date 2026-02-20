import type { DomainEvent } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';

export function orderCreatedEvent(orderId: string, customerId: string, correlationId?: string): DomainEvent {
  return {
    eventName: EventNames.ORDER_CREATED,
    payload: { orderId, customerId },
    timestamp: new Date(),
    correlationId,
  };
}

