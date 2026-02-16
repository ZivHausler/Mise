export interface NotificationRecipient {
  userId: string;
  name: string;
  email: string;
  phone?: string;
}

export interface NotificationContext {
  eventType: string;
  eventName: string;
  payload: Record<string, unknown>;
}

export interface NotificationChannel {
  send(recipient: NotificationRecipient, context: NotificationContext): Promise<void>;
}
