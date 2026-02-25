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
    private whatsAppNotifier: NotificationChannel,
    private logger: FastifyBaseLogger,
  ) {}

  async dispatch(event: DomainEvent): Promise<void> {
    const eventType = EVENT_NAME_MAP[event.eventName];
    if (!eventType) {
      this.logger.warn({ eventName: event.eventName }, 'No event type mapping for event');
      return;
    }

    const recipients = await PgNotifPrefsRepository.findByEventType(eventType);

    const emailRecipients: NotificationRecipient[] = [];
    const smsRecipients: NotificationRecipient[] = [];
    const whatsAppRecipients: { recipient: NotificationRecipient; storeId: number }[] = [];

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

      if (recipient.channelWhatsapp && recipient.phone && recipient.storeId) {
        whatsAppRecipients.push({ recipient: nr, storeId: recipient.storeId });
      }
    }

    const context = {
      eventType,
      eventName: event.eventName,
      payload: event.payload,
    };

    if (emailRecipients.length > 0) {
      await this.emailNotifier.sendBatch(emailRecipients, context);
    }

    if (smsRecipients.length > 0) {
      await this.smsNotifier.sendBatch(smsRecipients, context);
    }

    // WhatsApp: group by storeId and send with store context
    const byStore = new Map<number, NotificationRecipient[]>();
    for (const { recipient, storeId } of whatsAppRecipients) {
      const list = byStore.get(storeId) ?? [];
      list.push(recipient);
      byStore.set(storeId, list);
    }
    for (const [storeId, storeRecipients] of byStore) {
      await this.whatsAppNotifier.sendBatch(storeRecipients, { ...context, storeId });
    }

    this.logger.info(
      `Dispatched ${eventType} to ${recipients.length} user(s) (${emailRecipients.length} email, ${smsRecipients.length} sms, ${whatsAppRecipients.length} whatsapp)`,
    );
  }
}
