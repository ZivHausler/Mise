import type { FastifyInstance } from 'fastify';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { EmailNotifier } from './channels/email.js';
import { SmsNotifier } from './channels/sms.js';
import { WhatsAppNotifier } from './channels/whatsapp.js';
import { NotificationDispatcher } from './notification.dispatcher.js';

const NOTIFICATION_EVENTS = [
  EventNames.ORDER_CREATED,
  EventNames.INVENTORY_LOW_STOCK,
  EventNames.PAYMENT_RECEIVED,
];

export default async function notificationRoutes(app: FastifyInstance) {
  const eventBus = getEventBus();

  const dispatcher = new NotificationDispatcher(
    new EmailNotifier(),
    new SmsNotifier(),
    new WhatsAppNotifier(),
    app.log,
  );

  for (const eventName of NOTIFICATION_EVENTS) {
    eventBus.subscribe(eventName, (event) => dispatcher.dispatch(event));
  }

  app.log.info('Notification event handlers registered');
}
