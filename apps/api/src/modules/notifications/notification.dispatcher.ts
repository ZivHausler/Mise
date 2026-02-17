import type { DomainEvent } from '../../core/events/event-bus.js';
import { PgNotifPrefsRepository } from '../settings/notifications/notifications.repository.js';
import type { NotificationChannel } from './channels/channel.js';
import type { FastifyBaseLogger } from 'fastify';

const EVENT_NAME_MAP: Record<string, string> = {
  'order.created': 'order_created',
  'order.statusChanged': 'order_status_changed',
  'inventory.lowStock': 'low_stock',
  'payment.received': 'payment_received',
};

export class NotificationDispatcher {
  constructor(
    private emailNotifier: NotificationChannel,
    private smsNotifier: NotificationChannel,
    private logger: FastifyBaseLogger,
  ) {}

  async dispatch(event: DomainEvent): Promise<void> {
    const eventType = EVENT_NAME_MAP[event.eventName];
    if (!eventType) {
      this.logger.warn({ eventName: event.eventName }, 'No event type mapping for event');
      return;
    }

    const recipients = await PgNotifPrefsRepository.findByEventType(eventType);
    let emailCount = 0;
    let smsCount = 0;

    for (const recipient of recipients) {
      const context = {
        eventType,
        eventName: event.eventName,
        payload: event.payload,
      };

      if (recipient.channelEmail) {
        await this.emailNotifier.send(
          { userId: recipient.userId, name: recipient.name, email: recipient.email, phone: recipient.phone },
          context,
        );
        emailCount++;
      }

      if (recipient.channelSms && recipient.phone) {
        await this.smsNotifier.send(
          { userId: recipient.userId, name: recipient.name, email: recipient.email, phone: recipient.phone },
          context,
        );
        smsCount++;
      }
    }

    this.logger.info(
      `Dispatched ${eventType} to ${recipients.length} user(s) (${emailCount} email, ${smsCount} sms)`,
    );
  }
}
