import type { NotificationChannel, NotificationRecipient, NotificationContext } from './channel.js';
import { appLogger } from '../../../core/logger/logger.js';

// TODO: Integrate a real email provider (e.g. SendGrid, AWS SES, Resend)
export class EmailNotifier implements NotificationChannel {
  async send(recipient: NotificationRecipient, context: NotificationContext): Promise<void> {
    // TODO: Replace this stub with actual email sending logic
    appLogger.warn(
      { to: recipient.email, eventType: context.eventType, payload: context.payload },
      '[EMAIL] Notification NOT sent — channel is not configured',
    );
  }
}
