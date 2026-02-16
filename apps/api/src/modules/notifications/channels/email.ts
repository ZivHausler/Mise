import type { NotificationChannel, NotificationRecipient, NotificationContext } from './channel.js';

export class EmailNotifier implements NotificationChannel {
  async send(recipient: NotificationRecipient, context: NotificationContext): Promise<void> {
    console.log(
      `[EMAIL] To: ${recipient.email} | ${context.eventType} | ${JSON.stringify(context.payload)}`,
    );
  }
}
