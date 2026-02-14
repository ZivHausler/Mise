import type { DomainEvent } from '../../core/events/event-bus.js';

export function orderCreatedEvent(orderId: string, customerId: string): DomainEvent {
  return {
    eventName: 'order.created',
    payload: { orderId, customerId },
    timestamp: new Date(),
  };
}

export function orderStatusChangedEvent(
  orderId: string,
  previousStatus: string,
  newStatus: string,
): DomainEvent {
  return {
    eventName: 'order.statusChanged',
    payload: { orderId, previousStatus, newStatus },
    timestamp: new Date(),
  };
}
