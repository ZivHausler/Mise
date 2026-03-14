import { env } from '../../config/env.js';
import { appLogger } from '../../core/logger/logger.js';
import { ValidationError, InternalError } from '../../core/errors/app-error.js';

export class PayPalOrdersService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }
    const credentials = Buffer.from(
      `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`,
    ).toString('base64');
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
      appLogger.error({ status: response.status, body: text }, '[PayPalOrders] Auth failed');
      throw new InternalError('PayPal auth error');
    }
    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = now + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  async createOrder(
    amount: number,
    currency: string,
    description: string,
    storeSlug: string,
  ): Promise<{ paypalOrderId: string; approvalUrl: string }> {
    const token = await this.getAccessToken();
    const idempotencyKey = `${storeSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const response = await fetch(`${env.PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': idempotencyKey,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          description,
          custom_id: `store:${storeSlug}`,
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Mise',
              locale: 'he-IL',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: 'https://mise.co.il/payment/return',
              cancel_url: 'https://mise.co.il/payment/cancel',
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text }, '[PayPalOrders] Create order failed');
      throw new InternalError('PayPal create order error');
    }

    const data = (await response.json()) as {
      id: string;
      links: Array<{ href: string; rel: string }>;
    };

    const approvalLink = data.links.find((l) => l.rel === 'payer-action');
    if (!approvalLink?.href) {
      appLogger.error({ links: data.links }, '[PayPalOrders] No approval link in response');
      throw new InternalError('PayPal order created but no approval URL returned');
    }
    return {
      paypalOrderId: data.id,
      approvalUrl: approvalLink.href,
    };
  }

  async captureOrder(paypalOrderId: string): Promise<{
    status: string;
    transactionId: string;
    amount: { currency: string; value: string };
  }> {
    // Validate order ID format
    if (!/^[A-Z0-9]+$/i.test(paypalOrderId)) {
      throw new ValidationError('Invalid PayPal order ID format');
    }

    const token = await this.getAccessToken();
    const response = await fetch(
      `${env.PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      appLogger.error({ status: response.status, body: text }, '[PayPalOrders] Capture failed');
      throw new InternalError('PayPal capture error');
    }

    const data = (await response.json()) as {
      status: string;
      purchase_units: Array<{
        payments: {
          captures: Array<{
            id: string;
            amount: { currency_code: string; value: string };
          }>;
        };
      }>;
    };

    const capture = data.purchase_units[0]?.payments?.captures?.[0];
    return {
      status: data.status,
      transactionId: capture?.id ?? '',
      amount: {
        currency: capture?.amount?.currency_code ?? 'ILS',
        value: capture?.amount?.value ?? '0',
      },
    };
  }

  async refundCapture(captureId: string): Promise<{ refundId: string; status: string }> {
    if (!/^[A-Z0-9]+$/i.test(captureId)) {
      throw new ValidationError('Invalid capture ID format');
    }
    const token = await this.getAccessToken();
    const idempotencyKey = `refund-${captureId}-${Date.now()}`;

    const response = await fetch(
      `${env.PAYPAL_API_URL}/v2/payments/captures/${captureId}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': idempotencyKey,
        },
        body: '{}',
      },
    );

    if (!response.ok) {
      const text = await response.text();
      // 409 = already refunded — treat as success
      if (response.status === 409) {
        appLogger.warn({ captureId }, '[PayPalOrders] Capture already refunded');
        return { refundId: '', status: 'ALREADY_REFUNDED' };
      }
      appLogger.error({ status: response.status, body: text }, '[PayPalOrders] Refund failed');
      throw new InternalError('PayPal refund error');
    }

    const data = (await response.json()) as { id: string; status: string };
    return { refundId: data.id, status: data.status };
  }
}
