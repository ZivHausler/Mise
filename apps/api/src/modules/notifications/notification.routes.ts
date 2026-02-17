import type { FastifyInstance } from 'fastify';
import { getEventBus } from '../../core/events/event-bus.js';
import { EmailNotifier } from './channels/email.js';
import { SmsNotifier } from './channels/sms.js';
import { NotificationDispatcher } from './notification.dispatcher.js';

const NOTIFICATION_EVENTS = [
  'order.created',
  'order.statusChanged',
  'inventory.lowStock',
  'payment.received',
];

export default async function notificationRoutes(app: FastifyInstance) {
  const eventBus = getEventBus();

  const dispatcher = new NotificationDispatcher(
    new EmailNotifier(),
    new SmsNotifier(),
    app.log,
  );

  for (const eventName of NOTIFICATION_EVENTS) {
    eventBus.subscribe(eventName, (event) => dispatcher.dispatch(event));
  }

  app.log.info('Notification event handlers registered');
}
