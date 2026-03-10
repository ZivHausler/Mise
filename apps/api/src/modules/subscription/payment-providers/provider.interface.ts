export interface CreateRecurringParams {
  amountNis: number;
  description: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  successUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}

export interface CreateRecurringResult {
  pageUrl: string;
  providerSessionId: string;
}

export interface CreateSDKSubscriptionParams {
  amountNis: number;
  description: string;
  customerEmail: string;
  customerName: string;
  metadata: Record<string, string>;
}

export interface CreateSDKSubscriptionResult {
  subscriptionId: string;
}

export interface WebhookEvent {
  type: 'payment_success' | 'payment_failure' | 'subscription_canceled' | 'subscription_suspended';
  providerSessionId?: string;
  providerSubscriptionId?: string;
  transactionId?: string;
  amount?: number;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProvider {
  name: 'payplus' | 'paypal';
  createRecurringPaymentPage(params: CreateRecurringParams): Promise<CreateRecurringResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<boolean>;
  parseWebhookEvent(body: Record<string, unknown>): WebhookEvent;
}
