import { env } from '../../../config/env.js';
import { appLogger } from '../../../core/logger/logger.js';
import type { PaymentProvider, CreateRecurringParams, CreateRecurringResult, CreateSDKSubscriptionParams, CreateSDKSubscriptionResult, WebhookEvent } from './provider.interface.js';

export class PayPalProvider implements PaymentProvider {
  readonly name = 'paypal' as const;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${env.PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text }, '[PayPal] Failed to get access token');
      throw new Error(`PayPal auth error: ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    // Expire 60s early to avoid edge cases
    this.tokenExpiresAt = now + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  private async apiRequest(method: string, path: string, body?: unknown): Promise<Response> {
    const token = await this.getAccessToken();
    return fetch(`${env.PAYPAL_API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  async createRecurringPaymentPage(params: CreateRecurringParams): Promise<CreateRecurringResult> {
    // The plan_id must be pre-configured in PayPal dashboard and passed via metadata
    const paypalPlanId = params.metadata['paypal_plan_id'];
    if (!paypalPlanId) {
      throw new Error('PayPal plan_id is required in metadata');
    }

    // Get the plan's regular price to check if this is a prorated first payment
    const planPriceNis = params.metadata['plan_price_nis']
      ? parseFloat(params.metadata['plan_price_nis'])
      : null;
    const isProrated = planPriceNis !== null && params.amountNis < planPriceNis;

    const subscriptionBody: Record<string, unknown> = {
      plan_id: paypalPlanId,
      subscriber: {
        name: {
          given_name: params.customerName.split(' ')[0] || params.customerName,
          surname: params.customerName.split(' ').slice(1).join(' ') || '',
        },
        email_address: params.customerEmail,
      },
      application_context: {
        brand_name: 'Mise',
        locale: 'he-IL',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: params.successUrl,
        cancel_url: params.cancelUrl,
      },
      custom_id: params.metadata['checkout_session_id'] ?? '',
    };

    // For prorated upgrades: charge the prorated diff as a setup fee now,
    // and delay the first regular billing cycle to the next period end
    if (isProrated) {
      subscriptionBody['plan'] = {
        payment_preferences: {
          setup_fee: {
            value: params.amountNis.toFixed(2),
            currency_code: 'ILS',
          },
        },
      };
      // Delay the first regular charge to the current period end
      const periodEnd = params.metadata['period_end'];
      if (periodEnd) {
        subscriptionBody['start_time'] = new Date(periodEnd).toISOString();
      }
    }

    const response = await this.apiRequest('POST', '/v1/billing/subscriptions', subscriptionBody);

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text }, '[PayPal] Failed to create subscription');
      throw new Error('Payment provider error');
    }

    const data = (await response.json()) as {
      id: string;
      status: string;
      links: Array<{ href: string; rel: string }>;
    };

    const approvalLink = data.links.find((l) => l.rel === 'approve');
    if (!approvalLink) {
      appLogger.error({ data }, '[PayPal] No approval link in subscription response');
      throw new Error('PayPal: no approval link returned');
    }

    return {
      pageUrl: approvalLink.href,
      providerSessionId: data.id,
    };
  }

  async createSubscriptionForSDK(params: CreateSDKSubscriptionParams): Promise<CreateSDKSubscriptionResult> {
    const paypalPlanId = params.metadata['paypal_plan_id'];
    if (!paypalPlanId) {
      throw new Error('PayPal plan_id is required in metadata');
    }

    const planPriceNis = params.metadata['plan_price_nis']
      ? parseFloat(params.metadata['plan_price_nis'])
      : null;
    const isProrated = planPriceNis !== null && params.amountNis < planPriceNis;

    const subscriptionBody: Record<string, unknown> = {
      plan_id: paypalPlanId,
      subscriber: {
        name: {
          given_name: params.customerName.split(' ')[0] || params.customerName,
          surname: params.customerName.split(' ').slice(1).join(' ') || '',
        },
        email_address: params.customerEmail,
      },
      application_context: {
        brand_name: 'Mise',
        locale: 'he-IL',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
      },
      custom_id: params.metadata['checkout_session_id'] ?? '',
    };

    if (isProrated) {
      subscriptionBody['plan'] = {
        payment_preferences: {
          setup_fee: {
            value: params.amountNis.toFixed(2),
            currency_code: 'ILS',
          },
        },
      };
      const periodEnd = params.metadata['period_end'];
      if (periodEnd) {
        subscriptionBody['start_time'] = new Date(periodEnd).toISOString();
      }
    }

    const response = await this.apiRequest('POST', '/v1/billing/subscriptions', subscriptionBody);

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text }, '[PayPal] Failed to create SDK subscription');
      throw new Error('Payment provider error');
    }

    const data = (await response.json()) as {
      id: string;
      status: string;
    };

    return {
      subscriptionId: data.id,
    };
  }

  /**
   * Get the most recent transaction (sale) ID for a PayPal subscription.
   */
  async getLastTransactionId(subscriptionId: string): Promise<string | null> {
    if (!/^I-[A-Z0-9-]+$/i.test(subscriptionId)) {
      throw new Error('Invalid PayPal subscription ID format');
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const endTime = now.toISOString();

    const response = await this.apiRequest(
      'GET',
      `/v1/billing/subscriptions/${subscriptionId}/transactions?start_time=${startTime}&end_time=${endTime}`,
    );

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text, subscriptionId }, '[PayPal] Failed to get subscription transactions');
      return null;
    }

    const data = (await response.json()) as { transactions: Array<{ id: string; status: string }> };
    // Find the most recent completed transaction
    const completed = data.transactions?.find((t) => t.status === 'COMPLETED');
    return completed?.id ?? null;
  }

  /**
   * Refund a captured payment.
   * @param captureId - The PayPal capture/sale ID
   * @param amountNis - Amount to refund in NIS
   * @returns The PayPal refund ID
   */
  async refundPayment(captureId: string, amountNis: number): Promise<string> {
    // Validate capture ID format to prevent path injection
    if (!/^[A-Z0-9]+$/i.test(captureId)) {
      throw new Error('Invalid PayPal capture ID format');
    }

    const response = await this.apiRequest(
      'POST',
      `/v2/payments/captures/${captureId}/refund`,
      {
        amount: {
          value: amountNis.toFixed(2),
          currency_code: 'ILS',
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text, captureId }, '[PayPal] Failed to refund capture');
      throw new Error(`PayPal refund error: ${response.status}`);
    }

    const data = (await response.json()) as { id: string; status: string };
    appLogger.info({ captureId, refundId: data.id, amountNis }, '[PayPal] Refund issued');
    return data.id;
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    // Validate subscription ID format to prevent path injection
    if (!/^I-[A-Z0-9-]+$/i.test(providerSubscriptionId)) {
      throw new Error('Invalid PayPal subscription ID format');
    }

    const response = await this.apiRequest(
      'POST',
      `/v1/billing/subscriptions/${providerSubscriptionId}/cancel`,
      { reason: 'Customer requested cancellation' },
    );

    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text, providerSubscriptionId }, '[PayPal] Failed to cancel subscription');
      throw new Error(`PayPal cancel error: ${response.status}`);
    }

    appLogger.info({ providerSubscriptionId }, '[PayPal] Subscription cancelled');
  }

  async verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<boolean> {
    if (!env.PAYPAL_WEBHOOK_ID) {
      appLogger.warn('[PayPal] PAYPAL_WEBHOOK_ID not configured, skipping verification');
      return false;
    }

    const verifyBody = {
      auth_algo: headers['paypal-auth-algo'] || '',
      cert_url: headers['paypal-cert-url'] || '',
      transmission_id: headers['paypal-transmission-id'] || '',
      transmission_sig: headers['paypal-transmission-sig'] || '',
      transmission_time: headers['paypal-transmission-time'] || '',
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody),
    };

    const response = await this.apiRequest('POST', '/v1/notifications/verify-webhook-signature', verifyBody);

    if (!response.ok) {
      appLogger.error({ status: response.status }, '[PayPal] Webhook verification API call failed');
      return false;
    }

    const data = (await response.json()) as { verification_status: string };
    return data.verification_status === 'SUCCESS';
  }

  parseWebhookEvent(body: Record<string, unknown>): WebhookEvent {
    const eventType = body['event_type'] as string;
    const resource = body['resource'] as Record<string, unknown> | undefined;
    const customId = resource?.['custom_id'] as string | undefined;

    // For PAYMENT.SALE.COMPLETED, resource.id is the transaction ID, not the subscription ID.
    // The subscription ID is in billing_agreement_id.
    const billingAgreementId = resource?.['billing_agreement_id'] as string | undefined;
    const subscriptionId = billingAgreementId || (resource?.['id'] as string | undefined);

    let type: WebhookEvent['type'];
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'PAYMENT.SALE.COMPLETED':
        type = 'payment_success';
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        type = 'subscription_suspended';
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        type = 'subscription_canceled';
        break;
      default:
        type = 'payment_failure';
    }

    const saleAmount = resource?.['amount'] as Record<string, string> | undefined;
    const amount = saleAmount?.['total'] ? Math.round(parseFloat(saleAmount['total']) * 100) : undefined;

    return {
      type,
      providerSessionId: customId,
      providerSubscriptionId: subscriptionId,
      transactionId: resource?.['id'] as string | undefined,
      amount,
      rawPayload: body,
    };
  }
}
