import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayPlusProvider } from '../../../src/modules/subscription/payment-providers/payplus.service.js';
import type { CreateRecurringParams } from '../../../src/modules/subscription/payment-providers/provider.interface.js';

// ─── Hoisted mocks ──────────────────────────────────────────────────
const { mockFetch } = vi.hoisted(() => {
  const mockFetch = vi.fn();
  return { mockFetch };
});

vi.stubGlobal('fetch', mockFetch);

vi.mock('../../../src/config/env.js', () => ({
  env: {
    PAYPLUS_API_KEY: 'test-api-key',
    PAYPLUS_SECRET_KEY: 'test-secret-key',
    PAYPLUS_API_URL: 'https://restapidev.payplus.co.il/api/v1.0',
    PAYPLUS_TERMINAL_UID: 'terminal-uid-123',
  },
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Tests ───────────────────────────────────────────────────────────

describe('PayPlusProvider', () => {
  let provider: PayPlusProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new PayPlusProvider();
  });

  // ─── createRecurringPaymentPage ────────────────────────────────

  describe('createRecurringPaymentPage', () => {
    const defaultParams: CreateRecurringParams = {
      amountNis: 49,
      description: 'Mise Basic Plan',
      customerEmail: 'owner@bakery.com',
      customerName: 'Test Baker',
      successUrl: 'https://mise.app/success',
      cancelUrl: 'https://mise.app/cancel',
      callbackUrl: 'https://api.mise.app/api/webhooks/payplus',
      metadata: {
        checkout_session_id: 'session-1',
        store_id: '10',
        plan_slug: 'basic',
      },
    };

    it('should call correct API endpoint with proper headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: { status: 'success', code: 0 },
          data: { payment_page_link: 'https://payplus.co.il/pay/abc', page_request_uid: 'pp-uid-1' },
        }),
      });

      await provider.createRecurringPaymentPage(defaultParams);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://restapidev.payplus.co.il/api/v1.0/PaymentPages/generateLink',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'api-key': 'test-api-key',
            'secret-key': 'test-secret-key',
          }),
        }),
      );
    });

    it('should return page URL and provider session ID on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: { status: 'success', code: 0 },
          data: { payment_page_link: 'https://payplus.co.il/pay/abc', page_request_uid: 'pp-uid-1' },
        }),
      });

      const result = await provider.createRecurringPaymentPage(defaultParams);

      expect(result).toEqual({
        pageUrl: 'https://payplus.co.il/pay/abc',
        providerSessionId: 'pp-uid-1',
      });
    });

    it('should include recurring payment setup in request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: { status: 'success', code: 0 },
          data: { payment_page_link: 'https://payplus.co.il/pay/abc', page_request_uid: 'pp-uid-1' },
        }),
      });

      await provider.createRecurringPaymentPage(defaultParams);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.creating_token).toBe(true);
      expect(body.recurring_payment).toEqual(expect.objectContaining({
        recurring_payment_type: 1,
        amount: 49,
      }));
      expect(body.amount).toBe(49);
      expect(body.currency_code).toBe('ILS');
    });

    it('should throw on API HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(provider.createRecurringPaymentPage(defaultParams))
        .rejects.toThrow('Payment provider error');
    });

    it('should throw on PayPlus business-level error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: { status: 'error', code: 1, description: 'Terminal not found' },
          data: {},
        }),
      });

      await expect(provider.createRecurringPaymentPage(defaultParams))
        .rejects.toThrow('PayPlus error: Terminal not found');
    });

    it('should pass checkout_session_id in more_info field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: { status: 'success', code: 0 },
          data: { payment_page_link: 'https://payplus.co.il/pay/abc', page_request_uid: 'pp-uid-1' },
        }),
      });

      await provider.createRecurringPaymentPage(defaultParams);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.more_info).toBe('session-1');
      expect(body.more_info_1).toBe('10');
      expect(body.more_info_2).toBe('basic');
    });
  });

  // ─── verifyWebhook ────────────────────────────────────────────

  describe('verifyWebhook', () => {
    function computeHmac(body: string): string {
      const { createHmac } = require('crypto');
      return createHmac('sha256', 'test-secret-key').update(body).digest('hex');
    }

    it('should return true when HMAC signature matches', async () => {
      const body = '{"transaction":{"status_code":"000"}}';
      const signature = computeHmac(body);
      const result = await provider.verifyWebhook(
        { 'x-payplus-signature': signature },
        body,
      );

      expect(result).toBe(true);
    });

    it('should return true with payplus-signature header', async () => {
      const body = '{"test":true}';
      const signature = computeHmac(body);
      const result = await provider.verifyWebhook(
        { 'payplus-signature': signature },
        body,
      );

      expect(result).toBe(true);
    });

    it('should return false when signature does not match', async () => {
      const result = await provider.verifyWebhook(
        { 'x-payplus-signature': 'invalidsignature' },
        '{}',
      );

      expect(result).toBe(false);
    });

    it('should return false when signature header is missing', async () => {
      const result = await provider.verifyWebhook({}, '{}');

      expect(result).toBe(false);
    });
  });

  // ─── parseWebhookEvent ────────────────────────────────────────

  describe('parseWebhookEvent', () => {
    it('should map status_code 000 to payment_success', () => {
      const event = provider.parseWebhookEvent({
        transaction: { status_code: '000', uid: 'tx-1', amount: 49 },
        page_request_uid: 'pp-session-1',
        recurring_payment_uid: 'pp-recurring-1',
      });

      expect(event.type).toBe('payment_success');
      expect(event.providerSessionId).toBe('pp-session-1');
      expect(event.providerSubscriptionId).toBe('pp-recurring-1');
      expect(event.transactionId).toBe('tx-1');
      expect(event.amount).toBe(4900); // 49 NIS * 100 = agorot
    });

    it('should map non-000 status to payment_failure', () => {
      const event = provider.parseWebhookEvent({
        transaction: { status_code: '405', uid: 'tx-2' },
        page_request_uid: 'pp-session-1',
      });

      expect(event.type).toBe('payment_failure');
    });

    it('should map subscription_suspended event type', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'subscription_suspended',
        recurring_payment_uid: 'pp-recurring-1',
      });

      expect(event.type).toBe('subscription_suspended');
      expect(event.providerSubscriptionId).toBe('pp-recurring-1');
    });

    it('should map recurring_suspended event type', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'recurring_suspended',
        recurring_payment_uid: 'pp-recurring-1',
      });

      expect(event.type).toBe('subscription_suspended');
    });

    it('should map subscription_canceled event type', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'subscription_canceled',
        recurring_payment_uid: 'pp-recurring-1',
      });

      expect(event.type).toBe('subscription_canceled');
    });

    it('should map recurring_canceled event type', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'recurring_canceled',
        recurring_payment_uid: 'pp-recurring-1',
      });

      expect(event.type).toBe('subscription_canceled');
    });

    it('should use more_info as fallback for page_request_uid', () => {
      const event = provider.parseWebhookEvent({
        transaction: { status_code: '000' },
        more_info: 'session-from-more-info',
      });

      expect(event.providerSessionId).toBe('session-from-more-info');
    });

    it('should convert NIS amount to agorot', () => {
      const event = provider.parseWebhookEvent({
        transaction: { status_code: '000', amount: 99.50 },
      });

      expect(event.amount).toBe(9950);
    });

    it('should include raw payload', () => {
      const payload = { transaction: { status_code: '000' }, custom_field: 'value' };
      const event = provider.parseWebhookEvent(payload);

      expect(event.rawPayload).toEqual(payload);
    });
  });

  // ─── cancelSubscription ───────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should call correct cancel endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await provider.cancelSubscription('pp-recurring-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://restapidev.payplus.co.il/api/v1.0/RecurringPayments/Cancel',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ recurring_payment_uid: 'pp-recurring-1' }),
        }),
      );
    });

    it('should throw on cancel API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(provider.cancelSubscription('pp-recurring-1'))
        .rejects.toThrow('PayPlus cancel error: 400');
    });
  });
});
