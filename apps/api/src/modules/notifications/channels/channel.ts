export interface NotificationRecipient {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  language: number;
}

export interface NotificationContext {
  eventType: string;
  eventName: string;
  payload: Record<string, unknown>;
  storeId?: number;
}

export interface NotificationChannel {
  send(recipient: NotificationRecipient, context: NotificationContext): Promise<void>;
  sendBatch(recipients: NotificationRecipient[], context: NotificationContext): Promise<void>;
}
