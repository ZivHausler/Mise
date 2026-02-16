import type { NotificationChannel, NotificationRecipient, NotificationContext } from './channel.js';

export class SmsNotifier implements NotificationChannel {
  async send(recipient: NotificationRecipient, context: NotificationContext): Promise<void> {
    console.log(
      `[SMS] To: ${recipient.phone} | ${context.eventType} | ${JSON.stringify(context.payload)}`,
    );
  }
}
