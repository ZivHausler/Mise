import type { FastifyInstance } from 'fastify';
import type { EventBus } from '../../core/events/event-bus.js';
import { InMemoryEventBus } from '../../core/events/event-bus.js';

export default async function notificationRoutes(app: FastifyInstance) {
  const eventBus: EventBus = (app as any).container?.resolve?.('eventBus') ?? new InMemoryEventBus();

  // Subscribe to domain events and log them (future: push notifications, email, etc.)
  eventBus.subscribe('order.created', async (event) => {
    app.log.info({ event }, 'Notification: New order created');
  });

  eventBus.subscribe('order.statusChanged', async (event) => {
    app.log.info({ event }, 'Notification: Order status changed');
  });

  eventBus.subscribe('inventory.lowStock', async (event) => {
    app.log.warn({ event }, 'Notification: Low stock alert');
  });

  eventBus.subscribe('payment.received', async (event) => {
    app.log.info({ event }, 'Notification: Payment received');
  });

  app.log.info('Notification event handlers registered');
}
