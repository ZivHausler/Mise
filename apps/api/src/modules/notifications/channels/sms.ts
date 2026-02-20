import type { NotificationChannel, NotificationRecipient, NotificationContext } from './channel.js';
import { appLogger } from '../../../core/logger/logger.js';

// TODO: Integrate a real SMS provider (e.g. Twilio, AWS SNS, MessageBird)
export class SmsNotifier implements NotificationChannel {
  async send(recipient: NotificationRecipient, context: NotificationContext): Promise<void> {
    // TODO: Replace this stub with actual SMS sending logic
    appLogger.warn(
      { to: recipient.phone, eventType: context.eventType, payload: context.payload },
      '[SMS] Notification NOT sent — channel is not configured',
    );
  }
}
