import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../../../config/env.js';
import { appLogger } from '../../../core/logger/logger.js';
import type { PaymentProvider, CreateRecurringParams, CreateRecurringResult, WebhookEvent } from './provider.interface.js';

export class PayPlusProvider implements PaymentProvider {
  readonly name = 'payplus' as const;

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'api-key': env.PAYPLUS_API_KEY,
      'secret-key': env.PAYPLUS_SECRET_KEY,
    };
  }

  async createRecurringPaymentPage(params: CreateRecurringParams): Promise<CreateRecurringResult> {
    const body = {
      payment_page_uid: env.PAYPLUS_TERMINAL_UID,
      charge_method: 1, // Regular charge
      amount: params.amountNis,
      currency_code: 'ILS',
      description: params.description,
      customer: {
        customer_name: params.customerName,
        email: params.customerEmail,
        ...(params.customerPhone ? { phone: params.customerPhone } : {}),
      },
      items: [
        {
          name: params.description,
          quantity: 1,
          price: params.amountNis,
          currency_code: 'ILS',
          vat_type: 0,
        },
      ],
      // Enable token creation for recurring billing
      creating_token: true,
      // Recurring payment setup
      recurring_payment: {
        recurring_payment_type: 1, // Monthly
        amount: params.amountNis,
        initial_amount: params.amountNis,
        total_payments: 0, // Unlimited
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      callback_url: params.callbackUrl,
      more_info: params.metadata['checkout_session_id'] ?? '',
      more_info_1: params.metadata['store_id'] ?? '',
      more_info_2: params.metadata['plan_slug'] ?? '',
    };

    const url = `${env.PAYPLUS_API_URL}/PaymentPages/generateLink`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text }, '[PayPlus] Failed to create payment page');
      throw new Error('Payment provider error');
    }

    const data = (await response.json()) as {
      results: { status: string; code: number; description: string };
      data: { payment_page_link: string; page_request_uid: string };
    };

    if (data.results?.status !== 'success' && data.results?.code !== 0) {
      appLogger.error({ results: data.results }, '[PayPlus] Payment page creation returned error');
      throw new Error(`PayPlus error: ${data.results?.description ?? 'Unknown error'}`);
    }

    return {
      pageUrl: data.data.payment_page_link,
      providerSessionId: data.data.page_request_uid,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const url = `${env.PAYPLUS_API_URL}/RecurringPayments/Cancel`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ recurring_payment_uid: providerSubscriptionId }),
    });

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text, providerSubscriptionId }, '[PayPlus] Failed to cancel subscription');
      throw new Error(`PayPlus cancel error: ${response.status}`);
    }

    appLogger.info({ providerSubscriptionId }, '[PayPlus] Subscription cancelled');
  }

  async verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<boolean> {
    const signature = headers['x-payplus-signature'] || headers['payplus-signature'] || '';
    if (!signature) {
      // No signature header — cannot verify authenticity
      appLogger.warn('[PayPlus] Webhook missing signature header');
      return false;
    }

    const expectedSig = createHmac('sha256', env.PAYPLUS_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  }

  parseWebhookEvent(body: Record<string, unknown>): WebhookEvent {
    const transaction = body['transaction'] as Record<string, unknown> | undefined;
    const statusCode = (transaction?.['status_code'] ?? body['status_code']) as string | undefined;
    const transactionUid = (transaction?.['uid'] ?? body['transaction_uid']) as string | undefined;
    const pageRequestUid = (body['page_request_uid'] ?? body['more_info']) as string | undefined;
    const amount = (transaction?.['amount'] ?? body['amount']) as number | undefined;
    const recurringPaymentUid = (body['recurring_payment_uid'] ?? transaction?.['recurring_payment_uid']) as string | undefined;

    // PayPlus status codes:
    // 000 = approved/success
    // 001-999 = various failures
    // suspended = recurring payment suspended (retries exhausted)
    let type: WebhookEvent['type'];
    if (statusCode === '000') {
      type = 'payment_success';
    } else if (body['event_type'] === 'subscription_suspended' || body['event_type'] === 'recurring_suspended') {
      type = 'subscription_suspended';
    } else if (body['event_type'] === 'subscription_canceled' || body['event_type'] === 'recurring_canceled') {
      type = 'subscription_canceled';
    } else {
      type = 'payment_failure';
    }

    return {
      type,
      providerSessionId: pageRequestUid,
      providerSubscriptionId: recurringPaymentUid,
      transactionId: transactionUid,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert NIS to agorot
      rawPayload: body,
    };
  }
}
