import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayPalProvider } from '../../../src/modules/subscription/payment-providers/paypal.service.js';
import type { CreateRecurringParams } from '../../../src/modules/subscription/payment-providers/provider.interface.js';

// ─── Hoisted mocks ──────────────────────────────────────────────────
const { mockFetch } = vi.hoisted(() => {
  const mockFetch = vi.fn();
  return { mockFetch };
});

vi.stubGlobal('fetch', mockFetch);

vi.mock('../../../src/config/env.js', () => ({
  env: {
    PAYPAL_CLIENT_ID: 'test-client-id',
    PAYPAL_CLIENT_SECRET: 'test-client-secret',
    PAYPAL_API_URL: 'https://api-m.sandbox.paypal.com',
    PAYPAL_WEBHOOK_ID: 'webhook-id-123',
  },
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Helpers ─────────────────────────────────────────────────────────

function mockOAuthTokenResponse() {
  return {
    ok: true,
    json: async () => ({ access_token: 'test-access-token', expires_in: 32400 }),
  };
}

function mockSubscriptionCreateResponse() {
  return {
    ok: true,
    json: async () => ({
      id: 'I-PAYPAL-SUB-1',
      status: 'APPROVAL_PENDING',
      links: [
        { href: 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-123', rel: 'approve' },
        { href: 'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-PAYPAL-SUB-1', rel: 'self' },
      ],
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('PayPalProvider', () => {
  let provider: PayPalProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new PayPalProvider();
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
      callbackUrl: 'https://api.mise.app/api/webhooks/paypal',
      metadata: {
        checkout_session_id: 'session-1',
        store_id: '10',
        plan_slug: 'basic',
        paypal_plan_id: 'P-PAYPAL-PLAN-BASIC',
      },
    };

    it('should get OAuth token then create subscription', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())       // OAuth token
        .mockResolvedValueOnce(mockSubscriptionCreateResponse()); // Create subscription

      const result = await provider.createRecurringPaymentPage(defaultParams);

      // First call: OAuth
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );

      // Second call: Create subscription
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api-m.sandbox.paypal.com/v1/billing/subscriptions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        }),
      );

      expect(result).toEqual({
        pageUrl: 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-123',
        providerSessionId: 'I-PAYPAL-SUB-1',
      });
    });

    it('should throw when paypal_plan_id missing from metadata', async () => {
      const paramsWithoutPlanId: CreateRecurringParams = {
        ...defaultParams,
        metadata: { checkout_session_id: 'session-1' },
      };

      await expect(provider.createRecurringPaymentPage(paramsWithoutPlanId))
        .rejects.toThrow('PayPal plan_id is required in metadata');
    });

    it('should throw on OAuth token failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(provider.createRecurringPaymentPage(defaultParams))
        .rejects.toThrow('PayPal auth error: 401');
    });

    it('should throw on subscription creation failure', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          text: async () => 'Unprocessable Entity',
        });

      await expect(provider.createRecurringPaymentPage(defaultParams))
        .rejects.toThrow('Payment provider error');
    });

    it('should throw when no approval link returned', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'I-PAYPAL-SUB-1',
            status: 'CREATED',
            links: [{ href: 'https://api/self', rel: 'self' }], // No approve link
          }),
        });

      await expect(provider.createRecurringPaymentPage(defaultParams))
        .rejects.toThrow('PayPal: no approval link returned');
    });

    it('should reuse cached token when not expired', async () => {
      // First call gets token
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce(mockSubscriptionCreateResponse());
      await provider.createRecurringPaymentPage(defaultParams);

      // Second call should reuse token (no new OAuth call)
      mockFetch.mockResolvedValueOnce(mockSubscriptionCreateResponse());
      await provider.createRecurringPaymentPage(defaultParams);

      // Only 3 fetch calls total (1 OAuth + 1 create + 1 create), not 4
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should include custom_id with checkout_session_id', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce(mockSubscriptionCreateResponse());

      await provider.createRecurringPaymentPage(defaultParams);

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.custom_id).toBe('session-1');
      expect(body.plan_id).toBe('P-PAYPAL-PLAN-BASIC');
    });
  });

  // ─── createSubscriptionForSDK ─────────────────────────────────

  describe('createSubscriptionForSDK', () => {
    const defaultSDKParams = {
      amountNis: 49,
      description: 'Mise Basic Plan',
      customerEmail: 'owner@bakery.com',
      customerName: 'Test Baker',
      metadata: {
        checkout_session_id: 'session-1',
        store_id: '10',
        plan_slug: 'basic',
        paypal_plan_id: 'P-PAYPAL-PLAN-BASIC',
      },
    };

    it('should create subscription without return_url/cancel_url', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'I-SDK-SUB-1',
            status: 'APPROVAL_PENDING',
          }),
        });

      const result = await provider.createSubscriptionForSDK(defaultSDKParams);

      expect(result).toEqual({ subscriptionId: 'I-SDK-SUB-1' });

      // Verify the request body has NO return_url or cancel_url
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.application_context).toEqual({
        brand_name: 'Mise',
        locale: 'he-IL',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
      });
      expect(body.application_context.return_url).toBeUndefined();
      expect(body.application_context.cancel_url).toBeUndefined();
    });

    it('should include custom_id with checkout_session_id', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'I-SDK-SUB-1', status: 'APPROVAL_PENDING' }),
        });

      await provider.createSubscriptionForSDK(defaultSDKParams);

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.custom_id).toBe('session-1');
      expect(body.plan_id).toBe('P-PAYPAL-PLAN-BASIC');
    });

    it('should throw when paypal_plan_id missing from metadata', async () => {
      const params = {
        ...defaultSDKParams,
        metadata: { checkout_session_id: 'session-1' },
      };

      await expect(provider.createSubscriptionForSDK(params))
        .rejects.toThrow('PayPal plan_id is required in metadata');
    });

    it('should throw on API failure', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          text: async () => 'Unprocessable Entity',
        });

      await expect(provider.createSubscriptionForSDK(defaultSDKParams))
        .rejects.toThrow('Payment provider error');
    });

    it('should include setup_fee for prorated payments', async () => {
      const proratedParams = {
        ...defaultSDKParams,
        amountNis: 25,
        metadata: {
          ...defaultSDKParams.metadata,
          plan_price_nis: '49',
          period_end: '2026-03-31T00:00:00.000Z',
        },
      };

      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'I-SDK-SUB-2', status: 'APPROVAL_PENDING' }),
        });

      await provider.createSubscriptionForSDK(proratedParams);

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.plan.payment_preferences.setup_fee).toEqual({
        value: '25.00',
        currency_code: 'ILS',
      });
      expect(body.start_time).toBe('2026-03-31T00:00:00.000Z');
    });
  });

  // ─── verifyWebhook ────────────────────────────────────────────

  describe('verifyWebhook', () => {
    it('should call PayPal verification endpoint', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ verification_status: 'SUCCESS' }),
        });

      const headers = {
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594',
        'paypal-transmission-id': 'trans-id-1',
        'paypal-transmission-sig': 'sig-123',
        'paypal-transmission-time': '2026-03-10T12:00:00Z',
      };
      const rawBody = JSON.stringify({ event_type: 'BILLING.SUBSCRIPTION.ACTIVATED' });

      const result = await provider.verifyWebhook(headers, rawBody);

      expect(result).toBe(true);
      // Verify the second call was to the verify endpoint
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should return false when verification fails', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ verification_status: 'FAILURE' }),
        });

      const result = await provider.verifyWebhook(
        { 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': '', 'paypal-transmission-id': '', 'paypal-transmission-sig': '', 'paypal-transmission-time': '' },
        '{}',
      );

      expect(result).toBe(false);
    });

    it('should return false when verification API call fails', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await provider.verifyWebhook(
        { 'paypal-auth-algo': '', 'paypal-cert-url': '', 'paypal-transmission-id': '', 'paypal-transmission-sig': '', 'paypal-transmission-time': '' },
        '{}',
      );

      expect(result).toBe(false);
    });
  });

  // ─── parseWebhookEvent ────────────────────────────────────────

  describe('parseWebhookEvent', () => {
    it('should map BILLING.SUBSCRIPTION.ACTIVATED to payment_success', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
        resource: {
          id: 'I-SUB-123',
          custom_id: 'session-1',
        },
      });

      expect(event.type).toBe('payment_success');
      expect(event.providerSubscriptionId).toBe('I-SUB-123');
      expect(event.providerSessionId).toBe('session-1');
    });

    it('should map PAYMENT.SALE.COMPLETED to payment_success', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          id: 'sale-123',
          billing_agreement_id: 'I-SUB-123',
          amount: { total: '49.00', currency: 'ILS' },
        },
      });

      expect(event.type).toBe('payment_success');
      // billing_agreement_id is the actual subscription ID; resource.id is the sale/transaction ID
      expect(event.providerSubscriptionId).toBe('I-SUB-123');
      expect(event.amount).toBe(4900);
    });

    it('should map BILLING.SUBSCRIPTION.SUSPENDED to subscription_suspended', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'BILLING.SUBSCRIPTION.SUSPENDED',
        resource: { id: 'I-SUB-123' },
      });

      expect(event.type).toBe('subscription_suspended');
    });

    it('should map BILLING.SUBSCRIPTION.PAYMENT.FAILED to subscription_suspended', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
        resource: { id: 'I-SUB-123' },
      });

      expect(event.type).toBe('subscription_suspended');
    });

    it('should map BILLING.SUBSCRIPTION.CANCELLED to subscription_canceled', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: { id: 'I-SUB-123' },
      });

      expect(event.type).toBe('subscription_canceled');
    });

    it('should map unknown event types to payment_failure', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'SOME.UNKNOWN.EVENT',
        resource: {},
      });

      expect(event.type).toBe('payment_failure');
    });

    it('should use billing_agreement_id as fallback when resource.id is absent', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          billing_agreement_id: 'I-AGREEMENT-123',
        },
      });

      // When resource.id is undefined, billing_agreement_id is used as fallback
      expect(event.providerSubscriptionId).toBe('I-AGREEMENT-123');
    });

    it('should prefer billing_agreement_id over resource.id when both present', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          id: 'sale-id',
          billing_agreement_id: 'I-AGREEMENT-123',
        },
      });

      // billing_agreement_id is the subscription ID; resource.id is the transaction ID
      expect(event.providerSubscriptionId).toBe('I-AGREEMENT-123');
    });

    it('should parse decimal amount and convert to agorot', () => {
      const event = provider.parseWebhookEvent({
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          amount: { total: '99.50' },
        },
      });

      expect(event.amount).toBe(9950);
    });

    it('should include raw payload', () => {
      const payload = { event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', resource: { id: '123' } };
      const event = provider.parseWebhookEvent(payload);

      expect(event.rawPayload).toEqual(payload);
    });
  });

  // ─── cancelSubscription ───────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should call cancel endpoint with correct subscription ID', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({ ok: true });

      await provider.cancelSubscription('I-SUB-123');

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-123/cancel',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should not throw when subscription already cancelled (404)', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not Found' });

      // Should not throw for 404
      await expect(provider.cancelSubscription('I-SUB-123')).resolves.toBeUndefined();
    });

    it('should throw on other cancel errors', async () => {
      mockFetch
        .mockResolvedValueOnce(mockOAuthTokenResponse())
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Server Error' });

      await expect(provider.cancelSubscription('I-SUB-123'))
        .rejects.toThrow('PayPal cancel error: 500');
    });
  });
});
