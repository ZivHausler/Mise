import type { DomainEvent } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { PgNotifPrefsRepository } from '../settings/notifications/notifications.repository.js';
import type { NotificationChannel } from './channels/channel.js';
import type { FastifyBaseLogger } from 'fastify';

const EVENT_NAME_MAP: Record<string, string> = {
  [EventNames.ORDER_CREATED]: 'order_created',
  [EventNames.INVENTORY_LOW_STOCK]: 'low_stock',
  [EventNames.PAYMENT_RECEIVED]: 'payment_received',
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
          { userId: recipient.userId, name: recipient.name, email: recipient.email, phone: recipient.phone, language: recipient.language },
          context,
        );
        emailCount++;
      }

      if (recipient.channelSms && recipient.phone) {
        await this.smsNotifier.send(
          { userId: recipient.userId, name: recipient.name, email: recipient.email, phone: recipient.phone, language: recipient.language },
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
