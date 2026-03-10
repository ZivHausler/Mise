import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookController } from '../../../src/modules/subscription/webhook.controller.js';
import type { CheckoutService } from '../../../src/modules/subscription/checkout.service.js';
import type { PaymentProvider, WebhookEvent } from '../../../src/modules/subscription/payment-providers/provider.interface.js';

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockCheckoutService(): Record<string, ReturnType<typeof vi.fn>> {
  return {
    handlePaymentSuccess: vi.fn().mockResolvedValue(undefined),
    handlePaymentFailure: vi.fn().mockResolvedValue(undefined),
    handleSubscriptionSuspended: vi.fn().mockResolvedValue(undefined),
    getCheckoutStatus: vi.fn().mockResolvedValue({ status: 'pending' }),
  };
}

function createMockProvider(name: 'payplus' | 'paypal'): PaymentProvider {
  return {
    name,
    createRecurringPaymentPage: vi.fn(),
    cancelSubscription: vi.fn(),
    verifyWebhook: vi.fn().mockResolvedValue(true),
    parseWebhookEvent: vi.fn().mockReturnValue({
      type: 'payment_success',
      providerSessionId: 'session-1',
      rawPayload: {},
    } satisfies WebhookEvent),
  };
}

function createMockRequest(body: unknown, headers: Record<string, string> = {}): any {
  return { body, headers };
}

function createMockReply(): any {
  const reply: any = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('WebhookController', () => {
  let controller: WebhookController;
  let mockService: ReturnType<typeof createMockCheckoutService>;
  let payplusProvider: PaymentProvider;
  let paypalProvider: PaymentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockCheckoutService();
    payplusProvider = createMockProvider('payplus');
    paypalProvider = createMockProvider('paypal');

    const providers = new Map<string, PaymentProvider>([
      ['payplus', payplusProvider],
      ['paypal', paypalProvider],
    ]);

    controller = new WebhookController(mockService as unknown as CheckoutService, providers);
  });

  // ─── handlePayPlus ────────────────────────────────────────────

  describe('handlePayPlus', () => {
    it('should verify webhook, parse event, and dispatch payment_success', async () => {
      const request = createMockRequest({ transaction: { status_code: '000' } }, { 'api-key': 'key' });
      const reply = createMockReply();

      (payplusProvider.parseWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'payment_success', providerSessionId: 's-1', rawPayload: {},
      });

      await controller.handlePayPlus(request, reply);

      expect(payplusProvider.verifyWebhook).toHaveBeenCalled();
      expect(payplusProvider.parseWebhookEvent).toHaveBeenCalled();
      expect(mockService.handlePaymentSuccess).toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('should dispatch payment_failure events', async () => {
      const request = createMockRequest({}, {});
      const reply = createMockReply();

      (payplusProvider.parseWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'payment_failure', rawPayload: {},
      });

      await controller.handlePayPlus(request, reply);

      expect(mockService.handlePaymentFailure).toHaveBeenCalled();
    });

    it('should dispatch subscription_suspended events', async () => {
      const request = createMockRequest({}, {});
      const reply = createMockReply();

      (payplusProvider.parseWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'subscription_suspended', rawPayload: {},
      });

      await controller.handlePayPlus(request, reply);

      expect(mockService.handleSubscriptionSuspended).toHaveBeenCalled();
    });

    it('should return 200 even when verification fails', async () => {
      (payplusProvider.verifyWebhook as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const request = createMockRequest({}, {});
      const reply = createMockReply();

      await controller.handlePayPlus(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(mockService.handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it('should return 200 even when processing throws', async () => {
      const request = createMockRequest({}, {});
      const reply = createMockReply();

      (payplusProvider.parseWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'payment_success', rawPayload: {},
      });
      mockService.handlePaymentSuccess.mockRejectedValue(new Error('DB error'));

      await controller.handlePayPlus(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('should return 200 when provider not configured', async () => {
      const emptyProviders = new Map<string, PaymentProvider>();
      const ctrl = new WebhookController(mockService as unknown as CheckoutService, emptyProviders);
      const request = createMockRequest({});
      const reply = createMockReply();

      await ctrl.handlePayPlus(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('should log subscription_canceled without taking action', async () => {
      const request = createMockRequest({}, {});
      const reply = createMockReply();

      (payplusProvider.parseWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'subscription_canceled', rawPayload: {},
      });

      await controller.handlePayPlus(request, reply);

      // No service methods should be called for subscription_canceled
      expect(mockService.handlePaymentSuccess).not.toHaveBeenCalled();
      expect(mockService.handlePaymentFailure).not.toHaveBeenCalled();
      expect(mockService.handleSubscriptionSuspended).not.toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── handlePayPal ─────────────────────────────────────────────

  describe('handlePayPal', () => {
    it('should verify webhook, parse event, and dispatch', async () => {
      const request = createMockRequest({ event_type: 'BILLING.SUBSCRIPTION.ACTIVATED' });
      const reply = createMockReply();

      (paypalProvider.parseWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'payment_success', providerSessionId: 's-1', rawPayload: {},
      });

      await controller.handlePayPal(request, reply);

      expect(paypalProvider.verifyWebhook).toHaveBeenCalled();
      expect(mockService.handlePaymentSuccess).toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('should return 200 even when verification fails', async () => {
      (paypalProvider.verifyWebhook as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const request = createMockRequest({});
      const reply = createMockReply();

      await controller.handlePayPal(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(mockService.handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it('should return 200 even on processing error (no retries)', async () => {
      const request = createMockRequest({});
      const reply = createMockReply();

      (paypalProvider.parseWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'payment_success', rawPayload: {},
      });
      mockService.handlePaymentSuccess.mockRejectedValue(new Error('Internal error'));

      await controller.handlePayPal(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('should handle string body by passing to verifyWebhook as-is', async () => {
      const stringBody = '{"event_type":"BILLING.SUBSCRIPTION.ACTIVATED"}';
      const request = createMockRequest(stringBody);
      const reply = createMockReply();

      (paypalProvider.parseWebhookEvent as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'payment_success', rawPayload: {},
      });

      await controller.handlePayPal(request, reply);

      expect(paypalProvider.verifyWebhook).toHaveBeenCalledWith(
        expect.anything(),
        stringBody,
      );
    });
  });
});
