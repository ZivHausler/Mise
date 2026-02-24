import type { NotificationChannel, NotificationRecipient, NotificationContext } from './channel.js';
import { appLogger } from '../../../core/logger/logger.js';

// TODO: Integrate a real SMS provider (e.g. Twilio, AWS SNS, MessageBird)
export class SmsNotifier implements NotificationChannel {
  async send(recipient: NotificationRecipient, context: NotificationContext): Promise<void> {
    appLogger.warn(
      { to: recipient.phone, eventType: context.eventType, payload: context.payload },
      '[SMS] Notification NOT sent — channel is not configured',
    );
  }

  async sendBatch(recipients: NotificationRecipient[], context: NotificationContext): Promise<void> {
    for (const recipient of recipients) {
      await this.send(recipient, context);
    }
  }
}
