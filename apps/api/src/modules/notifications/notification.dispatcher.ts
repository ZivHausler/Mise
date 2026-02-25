import type { DomainEvent } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { PgNotifPrefsRepository } from '../settings/notifications/notifications.repository.js';
import type { NotificationChannel, NotificationRecipient } from './channels/channel.js';
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
    private whatsappNotifier: NotificationChannel,
    private logger: FastifyBaseLogger,
  ) {}

  async dispatch(event: DomainEvent): Promise<void> {
    const eventType = EVENT_NAME_MAP[event.eventName];
    if (!eventType) {
      this.logger.warn({ eventName: event.eventName }, 'No event type mapping for event');
      return;
    }

    const recipients = await PgNotifPrefsRepository.findByEventType(eventType);
    const context = {
      eventType,
      eventName: event.eventName,
      payload: event.payload,
    };

    const emailRecipients: NotificationRecipient[] = [];
    const smsRecipients: NotificationRecipient[] = [];
    const whatsappRecipients: NotificationRecipient[] = [];

    for (const recipient of recipients) {
      const nr: NotificationRecipient = {
        userId: recipient.userId,
        name: recipient.name,
        email: recipient.email,
        phone: recipient.phone,
        language: recipient.language,
      };

      if (recipient.channelEmail) {
        emailRecipients.push(nr);
      }

      if (recipient.channelSms && recipient.phone) {
        smsRecipients.push(nr);
      }

      if (recipient.channelWhatsapp && recipient.phone) {
        whatsappRecipients.push(nr);
      }
    }

    if (emailRecipients.length > 0) {
      await this.emailNotifier.sendBatch(emailRecipients, context);
    }

    if (smsRecipients.length > 0) {
      await this.smsNotifier.sendBatch(smsRecipients, context);
    }

    if (whatsappRecipients.length > 0) {
      await this.whatsappNotifier.sendBatch(whatsappRecipients, context);
    }

    this.logger.info(
      `Dispatched ${eventType} to ${recipients.length} user(s) (${emailRecipients.length} email, ${smsRecipients.length} sms, ${whatsappRecipients.length} whatsapp)`,
    );
  }
}
