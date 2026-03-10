import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutService } from '../../../src/modules/subscription/checkout.service.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import { PaymentType, PaymentStatus } from '../../../src/modules/subscription/subscription.types.js';
import type { Plan, StoreSubscription } from '../../../src/modules/subscription/subscription.types.js';
import type { CheckoutSession } from '../../../src/modules/subscription/checkout.repository.js';
import type { PaymentProvider, WebhookEvent } from '../../../src/modules/subscription/payment-providers/provider.interface.js';

// ─── Hoisted mocks ──────────────────────────────────────────────────
const { mockSubRepo, mockCheckoutRepo, mockClient } = vi.hoisted(() => {
  const mockClient = {
    query: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
  const mockSubRepo = {
    getPlans: vi.fn(),
    getPlanBySlug: vi.fn(),
    getPlanById: vi.fn(),
    getActiveSubscription: vi.fn(),
    getActiveSubscriptionForUpdate: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    expireSubscription: vi.fn(),
    logEvent: vi.fn(),
    getEvents: vi.fn(),
    createPayment: vi.fn(),
    hasPaymentToday: vi.fn().mockResolvedValue(false),
    getExpiredSubscriptions: vi.fn(),
    getDowngradeToPlanId: vi.fn().mockResolvedValue(null),
    getPayments: vi.fn(),
    getPaymentCount: vi.fn(),
    getByProviderSubscriptionId: vi.fn(),
    getExpiredGracePeriods: vi.fn(),
  };
  const mockCheckoutRepo = {
    create: vi.fn(),
    getById: vi.fn(),
    getByProviderSessionId: vi.fn(),
    updateStatus: vi.fn(),
    updateProviderInfo: vi.fn(),
    getPendingByStoreId: vi.fn(),
    getRecentlyCompletedByStoreId: vi.fn().mockResolvedValue(null),
    cancelPendingByStoreId: vi.fn(),
    expireStale: vi.fn(),
  };
  return { mockSubRepo, mockCheckoutRepo, mockClient };
});

vi.mock('../../../src/modules/subscription/subscription.repository.js', () => ({
  SubscriptionRepository: vi.fn().mockImplementation(() => mockSubRepo),
}));

vi.mock('../../../src/modules/subscription/checkout.repository.js', () => ({
  CheckoutRepository: vi.fn().mockImplementation(() => mockCheckoutRepo),
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(mockClient),
  }),
}));

vi.mock('../../../src/modules/stores/store.repository.js', () => ({
  PgStoreRepository: {
    getStoreMembers: vi.fn().mockResolvedValue([
      { id: 1, name: 'Test Owner', email: 'owner@bakery.com', role: 1 },
    ]),
  },
}));

vi.mock('../../../src/config/env.js', () => ({
  env: {
    FRONTEND_URL: 'https://mise.app',
    WEBHOOK_BASE_URL: 'https://api.mise.app',
    PAYPAL_PLAN_ID_BASIC: 'P-PAYPAL-PLAN-BASIC',
    PAYPAL_PLAN_ID_PRO: 'P-PAYPAL-PLAN-PRO',
  },
}));

vi.mock('../../../src/modules/notifications/channels/email.js', () => ({
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionDowngradedEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── Fixtures ────────────────────────────────────────────────────────
const FREE_PLAN: Plan = {
  id: 1, slug: 'free', name: 'Free', priceNis: 0,
  features: ['orders', 'customers'], sortOrder: 0, isActive: true,
};

const BASIC_PLAN: Plan = {
  id: 2, slug: 'basic', name: 'Basic', priceNis: 49,
  features: ['orders', 'customers', 'inventory', 'recipes'], sortOrder: 1, isActive: true,
};

const PRO_PLAN: Plan = {
  id: 3, slug: 'pro', name: 'Pro', priceNis: 99,
  features: ['orders', 'customers', 'inventory', 'recipes', 'analytics', 'ai_chat', 'whatsapp'],
  sortOrder: 2, isActive: true,
};

function createSubscription(overrides?: Partial<StoreSubscription>): StoreSubscription {
  const futureEnd = new Date();
  futureEnd.setDate(futureEnd.getDate() + 30);
  return {
    id: 1,
    storeId: 10,
    planId: 1,
    planSlug: 'free',
    planName: 'Free',
    priceNis: 0,
    status: 'active',
    trialEndsAt: null,
    currentPeriodStart: '2026-01-01T00:00:00.000Z',
    currentPeriodEnd: futureEnd.toISOString(),
    cancelAtPeriodEnd: false,
    downgradeToSlug: null,
    billingAnchorDay: null,
    features: ['orders', 'customers'],
    paymentProvider: null,
    providerSubscriptionId: null,
    gracePeriodEnd: null,
    paymentFailedCount: 0,
    ...overrides,
  };
}

function createCheckoutSession(overrides?: Partial<CheckoutSession>): CheckoutSession {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 30);
  return {
    id: 'session-uuid-1',
    storeId: 10,
    action: 'upgrade',
    targetPlanId: 2,
    fromPlanId: 1,
    amountAgorot: 4900,
    isProration: false,
    prorationDays: null,
    periodDays: null,
    provider: 'payplus',
    providerPageUrl: 'https://payplus.co.il/page/abc',
    providerSessionId: 'pp-session-1',
    status: 'pending',
    actorUserId: 1,
    expiresAt: expires.toISOString(),
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockProvider(name: 'payplus' | 'paypal' = 'payplus'): PaymentProvider {
  return {
    name,
    createRecurringPaymentPage: vi.fn().mockResolvedValue({
      pageUrl: `https://${name}.example.com/pay`,
      providerSessionId: `${name}-session-id`,
    }),
    cancelSubscription: vi.fn().mockResolvedValue(undefined),
    verifyWebhook: vi.fn().mockResolvedValue(true),
    parseWebhookEvent: vi.fn(),
  };
}

function createMockPayPalProvider() {
  const provider = createMockProvider('paypal');
  return {
    ...provider,
    createSubscriptionForSDK: vi.fn().mockResolvedValue({
      subscriptionId: 'I-PAYPAL-SDK-SUB-1',
    }),
  };
}

function createMockCache() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('CheckoutService', () => {
  let service: CheckoutService;
  let cache: ReturnType<typeof createMockCache>;
  let payplus: PaymentProvider;
  let paypal: ReturnType<typeof createMockPayPalProvider>;
  let providers: Map<string, PaymentProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockResolvedValue(undefined);

    cache = createMockCache();
    payplus = createMockProvider('payplus');
    paypal = createMockPayPalProvider();
    providers = new Map([
      ['payplus', payplus],
      ['paypal', paypal],
    ]);

    service = new CheckoutService(mockCheckoutRepo as any, providers, cache as any, paypal as any);
  });

  // ─── initiateCheckout ─────────────────────────────────────────────

  describe('initiateCheckout', () => {
    it('should create checkout session for free→basic upgrade', async () => {
      const currentSub = createSubscription({ planId: 1, planSlug: 'free' });
      mockSubRepo.getActiveSubscription.mockResolvedValue(currentSub);
      mockSubRepo.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockSubRepo.getPlanById.mockResolvedValue(FREE_PLAN);
      mockCheckoutRepo.create.mockResolvedValue('session-1');
      mockCheckoutRepo.cancelPendingByStoreId.mockResolvedValue(0);
      mockCheckoutRepo.updateProviderInfo.mockResolvedValue(undefined);
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ id: 'session-1' }));
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      const result = await service.initiateCheckout({
        storeId: 10, planSlug: 'basic', actorUserId: 1,
      });

      expect(result.checkoutSessionId).toBe('session-1');
      expect(result.paypalSubscriptionId).toBe('I-PAYPAL-SDK-SUB-1');
      expect(result.amountAgorot).toBe(4900); // 49 NIS * 100
      expect(mockCheckoutRepo.cancelPendingByStoreId).toHaveBeenCalledWith(10);
      expect(paypal.createSubscriptionForSDK).toHaveBeenCalled();
    });

    it('should create checkout session for free→pro upgrade', async () => {
      const currentSub = createSubscription({ planId: 1, planSlug: 'free' });
      mockSubRepo.getActiveSubscription.mockResolvedValue(currentSub);
      mockSubRepo.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockSubRepo.getPlanById.mockResolvedValue(FREE_PLAN);
      mockCheckoutRepo.create.mockResolvedValue('session-2');
      mockCheckoutRepo.cancelPendingByStoreId.mockResolvedValue(0);
      mockCheckoutRepo.updateProviderInfo.mockResolvedValue(undefined);
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ id: 'session-2', amountAgorot: 9900 }));
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      const result = await service.initiateCheckout({
        storeId: 10, planSlug: 'pro', actorUserId: 1,
      });

      expect(result.amountAgorot).toBe(9900); // 99 NIS * 100
    });

    it('should create prorated checkout session for basic→pro upgrade', async () => {
      const periodStart = new Date('2026-03-01T00:00:00.000Z');
      const periodEnd = new Date('2026-03-31T00:00:00.000Z');
      const currentSub = createSubscription({
        planId: 2, planSlug: 'basic', priceNis: 49,
        currentPeriodStart: periodStart.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        billingAnchorDay: 1,
      });

      mockSubRepo.getActiveSubscription.mockResolvedValue(currentSub);
      mockSubRepo.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockSubRepo.getPlanById.mockResolvedValue(BASIC_PLAN);
      mockCheckoutRepo.create.mockResolvedValue('session-3');
      mockCheckoutRepo.cancelPendingByStoreId.mockResolvedValue(0);
      mockCheckoutRepo.updateProviderInfo.mockResolvedValue(undefined);
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ id: 'session-3', isProration: true }));
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      const result = await service.initiateCheckout({
        storeId: 10, planSlug: 'pro', actorUserId: 1,
      });

      // The create call should have isProration: true
      expect(mockCheckoutRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isProration: true }),
      );
      expect(result.checkoutSessionId).toBe('session-3');
    });

    it('should reject if already on target plan', async () => {
      const currentSub = createSubscription({ planId: 2, planSlug: 'basic' });
      mockSubRepo.getActiveSubscription.mockResolvedValue(currentSub);
      mockSubRepo.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockSubRepo.getPlanById.mockResolvedValue(BASIC_PLAN);

      await expect(
        service.initiateCheckout({ storeId: 10, planSlug: 'basic', actorUserId: 1 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject downgrade attempts (upgrades only)', async () => {
      const currentSub = createSubscription({ planId: 3, planSlug: 'pro' });
      mockSubRepo.getActiveSubscription.mockResolvedValue(currentSub);
      mockSubRepo.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockSubRepo.getPlanById.mockResolvedValue(PRO_PLAN);

      await expect(
        service.initiateCheckout({ storeId: 10, planSlug: 'basic', actorUserId: 1 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should cancel any existing pending checkout before creating new one', async () => {
      const currentSub = createSubscription({ planId: 1, planSlug: 'free' });
      mockSubRepo.getActiveSubscription.mockResolvedValue(currentSub);
      mockSubRepo.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockSubRepo.getPlanById.mockResolvedValue(FREE_PLAN);
      mockCheckoutRepo.create.mockResolvedValue('session-new');
      mockCheckoutRepo.cancelPendingByStoreId.mockResolvedValue(1); // 1 cancelled
      mockCheckoutRepo.updateProviderInfo.mockResolvedValue(undefined);
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ id: 'session-new' }));
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      await service.initiateCheckout({
        storeId: 10, planSlug: 'basic', actorUserId: 1,
      });

      expect(mockCheckoutRepo.cancelPendingByStoreId).toHaveBeenCalledWith(10);
    });

    it('should throw when paypal provider is not configured', async () => {
      const emptyProviders = new Map<string, PaymentProvider>();
      const svc = new CheckoutService(mockCheckoutRepo as any, emptyProviders, cache as any);

      await expect(
        svc.initiateCheckout({ storeId: 10, planSlug: 'basic', actorUserId: 1 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when no active subscription exists', async () => {
      mockSubRepo.getActiveSubscription.mockResolvedValue(null);
      mockSubRepo.getPlanBySlug.mockResolvedValue(BASIC_PLAN);

      await expect(
        service.initiateCheckout({ storeId: 10, planSlug: 'basic', actorUserId: 1 }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when target plan does not exist', async () => {
      const currentSub = createSubscription();
      mockSubRepo.getActiveSubscription.mockResolvedValue(currentSub);
      mockSubRepo.getPlanBySlug.mockResolvedValue(null);

      await expect(
        service.initiateCheckout({ storeId: 10, planSlug: 'pro', actorUserId: 1 }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── initiateRenewalRecovery ──────────────────────────────────────

  describe('initiateRenewalRecovery', () => {
    it('should create recovery checkout for past_due subscription', async () => {
      const pastDueSub = createSubscription({
        planId: 2, planSlug: 'basic', status: 'past_due',
        priceNis: 49, paymentProvider: 'paypal',
      });
      mockSubRepo.getActiveSubscription.mockResolvedValue(pastDueSub);
      mockSubRepo.getPlanById.mockResolvedValue(BASIC_PLAN);
      mockCheckoutRepo.cancelPendingByStoreId.mockResolvedValue(0);
      mockCheckoutRepo.create.mockResolvedValue('recovery-session-1');
      mockCheckoutRepo.updateProviderInfo.mockResolvedValue(undefined);

      const result = await service.initiateRenewalRecovery({
        storeId: 10, actorUserId: 1,
      });

      expect(result.checkoutSessionId).toBe('recovery-session-1');
      expect(result.paypalSubscriptionId).toBe('I-PAYPAL-SDK-SUB-1');
      expect(mockCheckoutRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'renewal_recovery',
          amountAgorot: 4900,
          isProration: false,
        }),
      );
    });

    it('should reject if subscription is not past_due', async () => {
      const activeSub = createSubscription({ status: 'active' });
      mockSubRepo.getActiveSubscription.mockResolvedValue(activeSub);

      await expect(
        service.initiateRenewalRecovery({ storeId: 10, actorUserId: 1 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject if no subscription exists', async () => {
      mockSubRepo.getActiveSubscription.mockResolvedValue(null);

      await expect(
        service.initiateRenewalRecovery({ storeId: 10, actorUserId: 1 }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ─── handlePaymentSuccess ─────────────────────────────────────────

  describe('handlePaymentSuccess', () => {
    it('should activate subscription after checkout payment confirmed (upgrade)', async () => {
      const session = createCheckoutSession({
        action: 'upgrade', targetPlanId: 2, fromPlanId: 1, amountAgorot: 4900,
      });
      const currentSub = createSubscription({ planId: 1, planSlug: 'free' });

      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(session);
      mockSubRepo.getActiveSubscriptionForUpdate.mockResolvedValue(currentSub);
      mockSubRepo.getPlanById
        .mockResolvedValueOnce(BASIC_PLAN) // target plan
        .mockResolvedValueOnce(FREE_PLAN); // current plan
      mockSubRepo.updateSubscription.mockResolvedValue(undefined);
      mockSubRepo.createPayment.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);
      mockCheckoutRepo.updateStatus.mockResolvedValue(undefined);

      const event: WebhookEvent = {
        type: 'payment_success',
        providerSessionId: 'pp-session-1',
        providerSubscriptionId: 'pp-sub-1',
        transactionId: 'tx-1',
        rawPayload: {},
      };

      await service.handlePaymentSuccess(event);

      // Subscription updated with provider info
      expect(mockSubRepo.updateSubscription).toHaveBeenCalledWith(
        currentSub.id,
        expect.objectContaining({
          planId: BASIC_PLAN.id,
          paymentProvider: 'payplus',
          providerSubscriptionId: 'pp-sub-1',
        }),
        mockClient,
      );

      // Payment record created
      expect(mockSubRepo.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.SUCCEEDED,
          amountAgorot: 4900,
        }),
        mockClient,
      );

      // Session marked completed
      expect(mockCheckoutRepo.updateStatus).toHaveBeenCalledWith(
        session.id, 'completed', expect.any(Date), mockClient,
      );

      // Transaction committed
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should be idempotent: calling twice with same event is safe', async () => {
      const completedSession = createCheckoutSession({ status: 'completed' });
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(completedSession);

      const event: WebhookEvent = {
        type: 'payment_success',
        providerSessionId: 'pp-session-1',
        rawPayload: {},
      };

      await service.handlePaymentSuccess(event);

      // Should skip processing for already completed session
      expect(mockSubRepo.updateSubscription).not.toHaveBeenCalled();
      expect(mockSubRepo.createPayment).not.toHaveBeenCalled();
    });

    it('should work for renewal_recovery action', async () => {
      const session = createCheckoutSession({
        action: 'renewal_recovery', targetPlanId: 2, fromPlanId: 2, amountAgorot: 4900,
      });
      const pastDueSub = createSubscription({
        planId: 2, planSlug: 'basic', status: 'past_due',
        gracePeriodEnd: new Date().toISOString(),
        paymentFailedCount: 2,
        billingAnchorDay: 15,
      });

      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(session);
      mockSubRepo.getActiveSubscriptionForUpdate.mockResolvedValue(pastDueSub);
      mockSubRepo.updateSubscription.mockResolvedValue(undefined);
      mockSubRepo.createPayment.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);
      mockCheckoutRepo.updateStatus.mockResolvedValue(undefined);

      const event: WebhookEvent = {
        type: 'payment_success',
        providerSessionId: 'pp-session-1',
        providerSubscriptionId: 'pp-sub-1',
        rawPayload: {},
      };

      await service.handlePaymentSuccess(event);

      // Should clear past_due status and grace period
      expect(mockSubRepo.updateSubscription).toHaveBeenCalledWith(
        pastDueSub.id,
        expect.objectContaining({
          status: 'active',
          gracePeriodEnd: null,
          paymentFailedCount: 0,
        }),
        mockClient,
      );
    });

    it('should handle recurring charge with no checkout session (provider-initiated renewal)', async () => {
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(null);
      const activeSub = createSubscription({
        planId: 2, planSlug: 'basic', paymentProvider: 'payplus',
        providerSubscriptionId: 'pp-recurring-1',
      });
      mockSubRepo.getByProviderSubscriptionId.mockResolvedValue(activeSub);
      mockSubRepo.createPayment.mockResolvedValue(undefined);

      const event: WebhookEvent = {
        type: 'payment_success',
        providerSubscriptionId: 'pp-recurring-1',
        transactionId: 'tx-recurring-1',
        amount: 4900,
        rawPayload: {},
      };

      await service.handlePaymentSuccess(event);

      // Should record payment without checkout session
      expect(mockSubRepo.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: activeSub.storeId,
          subscriptionId: activeSub.id,
          amountAgorot: 4900,
          status: PaymentStatus.SUCCEEDED,
        }),
      );
    });

    it('should silently handle unknown webhook with no session and no subscription', async () => {
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(null);
      mockSubRepo.getByProviderSubscriptionId.mockResolvedValue(null);

      const event: WebhookEvent = {
        type: 'payment_success',
        providerSessionId: 'unknown-session',
        providerSubscriptionId: 'unknown-sub',
        rawPayload: {},
      };

      // Should not throw
      await expect(service.handlePaymentSuccess(event)).resolves.toBeUndefined();
    });
  });

  // ─── handlePaymentFailure ─────────────────────────────────────────

  describe('handlePaymentFailure', () => {
    it('should mark checkout session as failed', async () => {
      const session = createCheckoutSession({ status: 'pending' });
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(session);
      mockCheckoutRepo.updateStatus.mockResolvedValue(undefined);
      mockSubRepo.createPayment.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      const event: WebhookEvent = {
        type: 'payment_failure',
        providerSessionId: 'pp-session-1',
        rawPayload: {},
      };

      await service.handlePaymentFailure(event);

      expect(mockCheckoutRepo.updateStatus).toHaveBeenCalledWith(session.id, 'failed');
    });

    it('should create payment record with FAILED status', async () => {
      const session = createCheckoutSession({ status: 'pending', amountAgorot: 4900, isProration: false });
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(session);
      mockCheckoutRepo.updateStatus.mockResolvedValue(undefined);
      mockSubRepo.createPayment.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      const event: WebhookEvent = {
        type: 'payment_failure',
        providerSessionId: 'pp-session-1',
        rawPayload: {},
      };

      await service.handlePaymentFailure(event);

      expect(mockSubRepo.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.FAILED,
          amountAgorot: 4900,
        }),
      );
    });

    it('should NOT change subscription plan on payment failure', async () => {
      const session = createCheckoutSession({ status: 'pending' });
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(session);
      mockCheckoutRepo.updateStatus.mockResolvedValue(undefined);
      mockSubRepo.createPayment.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      const event: WebhookEvent = {
        type: 'payment_failure',
        providerSessionId: 'pp-session-1',
        rawPayload: {},
      };

      await service.handlePaymentFailure(event);

      expect(mockSubRepo.updateSubscription).not.toHaveBeenCalled();
    });

    it('should skip if session already completed/failed', async () => {
      const session = createCheckoutSession({ status: 'completed' });
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(session);

      const event: WebhookEvent = {
        type: 'payment_failure',
        providerSessionId: 'pp-session-1',
        rawPayload: {},
      };

      await service.handlePaymentFailure(event);

      expect(mockCheckoutRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should silently handle unknown session', async () => {
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(null);

      const event: WebhookEvent = {
        type: 'payment_failure',
        providerSessionId: 'unknown',
        rawPayload: {},
      };

      await expect(service.handlePaymentFailure(event)).resolves.toBeUndefined();
    });
  });

  // ─── handleSubscriptionSuspended ──────────────────────────────────

  describe('handleSubscriptionSuspended', () => {
    it('should set subscription to past_due with 3-day grace period', async () => {
      const activeSub = createSubscription({
        planId: 2, planSlug: 'basic', status: 'active',
        paymentProvider: 'payplus', providerSubscriptionId: 'pp-sub-1',
        paymentFailedCount: 0,
      });
      mockSubRepo.getByProviderSubscriptionId.mockResolvedValue(activeSub);
      mockSubRepo.getActiveSubscriptionForUpdate.mockResolvedValue(activeSub);
      mockSubRepo.updateSubscription.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);
      mockSubRepo.getPlanById.mockResolvedValue(BASIC_PLAN);

      const beforeCall = new Date();

      const event: WebhookEvent = {
        type: 'subscription_suspended',
        providerSubscriptionId: 'pp-sub-1',
        rawPayload: {},
      };

      await service.handleSubscriptionSuspended(event);

      expect(mockSubRepo.updateSubscription).toHaveBeenCalledWith(
        activeSub.id,
        expect.objectContaining({
          status: 'past_due',
          paymentFailedCount: 1,
        }),
        mockClient,
      );

      // Verify grace period is ~3 days from now
      const updateCall = mockSubRepo.updateSubscription.mock.calls[0];
      const gracePeriodEnd = updateCall[1].gracePeriodEnd as Date;
      const diffDays = (gracePeriodEnd.getTime() - beforeCall.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(2.9);
      expect(diffDays).toBeLessThanOrEqual(3.1);
    });

    it('should increment payment_failed_count', async () => {
      const subWithFailures = createSubscription({
        planId: 2, planSlug: 'basic', status: 'active',
        paymentProvider: 'payplus', providerSubscriptionId: 'pp-sub-1',
        paymentFailedCount: 2,
      });
      mockSubRepo.getByProviderSubscriptionId.mockResolvedValue(subWithFailures);
      mockSubRepo.getActiveSubscriptionForUpdate.mockResolvedValue(subWithFailures);
      mockSubRepo.updateSubscription.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);
      mockSubRepo.getPlanById.mockResolvedValue(BASIC_PLAN);

      const event: WebhookEvent = {
        type: 'subscription_suspended',
        providerSubscriptionId: 'pp-sub-1',
        rawPayload: {},
      };

      await service.handleSubscriptionSuspended(event);

      expect(mockSubRepo.updateSubscription).toHaveBeenCalledWith(
        subWithFailures.id,
        expect.objectContaining({ paymentFailedCount: 3 }),
        mockClient,
      );
    });

    it('should log grace_period_started event', async () => {
      const activeSub = createSubscription({
        planId: 2, planSlug: 'basic', paymentProvider: 'payplus',
        providerSubscriptionId: 'pp-sub-1',
      });
      mockSubRepo.getByProviderSubscriptionId.mockResolvedValue(activeSub);
      mockSubRepo.getActiveSubscriptionForUpdate.mockResolvedValue(activeSub);
      mockSubRepo.updateSubscription.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);
      mockSubRepo.getPlanById.mockResolvedValue(BASIC_PLAN);

      const event: WebhookEvent = {
        type: 'subscription_suspended',
        providerSubscriptionId: 'pp-sub-1',
        rawPayload: {},
      };

      await service.handleSubscriptionSuspended(event);

      expect(mockSubRepo.logEvent).toHaveBeenCalledWith(
        activeSub.storeId, activeSub.id, 'grace_period_started',
        activeSub.planId, activeSub.planId,
        expect.objectContaining({ gracePeriodEnd: expect.any(String) }),
        mockClient,
      );
    });

    it('should silently skip if providerSubscriptionId is missing', async () => {
      const event: WebhookEvent = {
        type: 'subscription_suspended',
        rawPayload: {},
      };

      await expect(service.handleSubscriptionSuspended(event)).resolves.toBeUndefined();
      expect(mockSubRepo.updateSubscription).not.toHaveBeenCalled();
    });

    it('should silently skip if subscription not found by provider ID', async () => {
      mockSubRepo.getByProviderSubscriptionId.mockResolvedValue(null);

      const event: WebhookEvent = {
        type: 'subscription_suspended',
        providerSubscriptionId: 'unknown-sub',
        rawPayload: {},
      };

      await expect(service.handleSubscriptionSuspended(event)).resolves.toBeUndefined();
      expect(mockSubRepo.updateSubscription).not.toHaveBeenCalled();
    });
  });

  // ─── processGracePeriodExpiry ─────────────────────────────────────

  describe('processGracePeriodExpiry', () => {
    it('should downgrade expired grace period subscriptions to free', async () => {
      const expiredSub1 = createSubscription({
        id: 100, storeId: 10, planId: 2, planSlug: 'basic', status: 'past_due',
        gracePeriodEnd: '2026-03-07T00:00:00.000Z', paymentFailedCount: 2,
      });
      const expiredSub2 = createSubscription({
        id: 101, storeId: 20, planId: 3, planSlug: 'pro', status: 'past_due',
        gracePeriodEnd: '2026-03-08T00:00:00.000Z', paymentFailedCount: 1,
      });

      mockSubRepo.getExpiredGracePeriods.mockResolvedValue([expiredSub1, expiredSub2]);
      mockSubRepo.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockSubRepo.expireSubscription.mockResolvedValue(undefined);
      mockSubRepo.createSubscription.mockResolvedValue({ id: 200 });
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      const processed = await service.processGracePeriodExpiry();

      expect(processed).toBe(2);
      expect(mockSubRepo.expireSubscription).toHaveBeenCalledTimes(2);
      expect(mockSubRepo.createSubscription).toHaveBeenCalledTimes(2);
    });

    it('should NOT downgrade subscriptions still within grace period', async () => {
      // getExpiredGracePeriods only returns truly expired ones, so empty array = nothing to do
      mockSubRepo.getExpiredGracePeriods.mockResolvedValue([]);

      const processed = await service.processGracePeriodExpiry();

      expect(processed).toBe(0);
      expect(mockSubRepo.expireSubscription).not.toHaveBeenCalled();
    });

    it('should handle multiple expired subscriptions in batch', async () => {
      const subs = Array.from({ length: 5 }, (_, i) =>
        createSubscription({
          id: 100 + i, storeId: 10 + i, planId: 2, planSlug: 'basic',
          status: 'past_due', gracePeriodEnd: '2026-03-01T00:00:00.000Z',
        }),
      );

      mockSubRepo.getExpiredGracePeriods.mockResolvedValue(subs);
      mockSubRepo.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockSubRepo.expireSubscription.mockResolvedValue(undefined);
      mockSubRepo.createSubscription.mockResolvedValue({ id: 999 });
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      const processed = await service.processGracePeriodExpiry();

      expect(processed).toBe(5);
    });

    it('should create proper event log entries with auto_downgraded_payment_failed', async () => {
      const expiredSub = createSubscription({
        id: 100, storeId: 10, planId: 2, planSlug: 'basic',
        status: 'past_due', paymentFailedCount: 3,
      });

      mockSubRepo.getExpiredGracePeriods.mockResolvedValue([expiredSub]);
      mockSubRepo.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockSubRepo.expireSubscription.mockResolvedValue(undefined);
      mockSubRepo.createSubscription.mockResolvedValue({ id: 200 });
      mockSubRepo.logEvent.mockResolvedValue(undefined);

      await service.processGracePeriodExpiry();

      expect(mockSubRepo.logEvent).toHaveBeenCalledWith(
        10, 200, 'auto_downgraded_payment_failed',
        2, FREE_PLAN.id,
        expect.objectContaining({ previousPlan: 'basic', paymentFailedCount: 3 }),
        mockClient,
      );
    });

    it('should return 0 when free plan not found', async () => {
      const expiredSub = createSubscription({ id: 100, status: 'past_due' });
      mockSubRepo.getExpiredGracePeriods.mockResolvedValue([expiredSub]);
      mockSubRepo.getPlanBySlug.mockResolvedValue(null); // no free plan

      const processed = await service.processGracePeriodExpiry();

      expect(processed).toBe(0);
      expect(mockSubRepo.expireSubscription).not.toHaveBeenCalled();
    });

    it('should continue processing other subscriptions if one fails', async () => {
      const sub1 = createSubscription({ id: 100, storeId: 10, planId: 2, planSlug: 'basic' });
      const sub2 = createSubscription({ id: 101, storeId: 20, planId: 2, planSlug: 'basic' });

      mockSubRepo.getExpiredGracePeriods.mockResolvedValue([sub1, sub2]);
      mockSubRepo.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      // First sub fails, second succeeds
      mockSubRepo.expireSubscription
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(undefined);
      mockSubRepo.createSubscription.mockResolvedValue({ id: 200 });
      mockSubRepo.logEvent.mockResolvedValue(undefined);
      // SAVEPOINT + ROLLBACK TO SAVEPOINT for the failed one
      mockClient.query.mockResolvedValue(undefined);

      const processed = await service.processGracePeriodExpiry();

      // Only the second should have been counted as processed
      expect(processed).toBe(1);
    });
  });

  // ─── expireStaleCheckouts ─────────────────────────────────────────

  describe('expireStaleCheckouts', () => {
    it('should expire checkout sessions past their expires_at', async () => {
      mockCheckoutRepo.expireStale.mockResolvedValue(3);

      const expired = await service.expireStaleCheckouts();

      expect(expired).toBe(3);
      expect(mockCheckoutRepo.expireStale).toHaveBeenCalled();
    });

    it('should return 0 when no stale sessions exist', async () => {
      mockCheckoutRepo.expireStale.mockResolvedValue(0);

      const expired = await service.expireStaleCheckouts();

      expect(expired).toBe(0);
    });
  });

  // ─── getCheckoutStatus ────────────────────────────────────────────

  describe('getCheckoutStatus', () => {
    it('should return correct status for pending session', async () => {
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ status: 'pending', storeId: 10 }));

      const result = await service.getCheckoutStatus('session-1', 10);

      expect(result).toEqual({ status: 'pending' });
    });

    it('should return correct status for completed session', async () => {
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ status: 'completed', storeId: 10 }));

      const result = await service.getCheckoutStatus('session-1', 10);

      expect(result).toEqual({ status: 'completed' });
    });

    it('should return correct status for failed session', async () => {
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ status: 'failed', storeId: 10 }));

      const result = await service.getCheckoutStatus('session-1', 10);

      expect(result).toEqual({ status: 'failed' });
    });

    it('should return correct status for expired session', async () => {
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ status: 'expired', storeId: 10 }));

      const result = await service.getCheckoutStatus('session-1', 10);

      expect(result).toEqual({ status: 'expired' });
    });

    it('should reject if session does not belong to requesting store (IDOR check)', async () => {
      mockCheckoutRepo.getById.mockResolvedValue(createCheckoutSession({ storeId: 99 }));

      await expect(service.getCheckoutStatus('session-1', 10)).rejects.toThrow(NotFoundError);
    });

    it('should reject if session does not exist', async () => {
      mockCheckoutRepo.getById.mockResolvedValue(null);

      await expect(service.getCheckoutStatus('nonexistent', 10)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('webhook arrives before user returns: should still activate via webhook', async () => {
      // This is the normal flow — webhook processes first, frontend polls and sees completed
      const session = createCheckoutSession({ status: 'pending' });
      const currentSub = createSubscription({ planId: 1, planSlug: 'free' });

      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(session);
      mockSubRepo.getActiveSubscriptionForUpdate.mockResolvedValue(currentSub);
      mockSubRepo.getPlanById
        .mockResolvedValueOnce(BASIC_PLAN)
        .mockResolvedValueOnce(FREE_PLAN);
      mockSubRepo.updateSubscription.mockResolvedValue(undefined);
      mockSubRepo.createPayment.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);
      mockCheckoutRepo.updateStatus.mockResolvedValue(undefined);

      const event: WebhookEvent = {
        type: 'payment_success',
        providerSessionId: 'pp-session-1',
        providerSubscriptionId: 'pp-sub-1',
        rawPayload: {},
      };

      await service.handlePaymentSuccess(event);

      // Session should be completed
      expect(mockCheckoutRepo.updateStatus).toHaveBeenCalledWith(
        session.id, 'completed', expect.any(Date), mockClient,
      );

      // Now frontend polls and sees completed
      mockCheckoutRepo.getById.mockResolvedValue(
        createCheckoutSession({ ...session, status: 'completed', storeId: 10 }),
      );
      const status = await service.getCheckoutStatus(session.id, 10);
      expect(status).toEqual({ status: 'completed' });
    });

    it('race condition: two webhooks for same checkout arrive simultaneously (idempotency)', async () => {
      // First webhook marks session as completed
      const session = createCheckoutSession({ status: 'pending' });
      const currentSub = createSubscription({ planId: 1, planSlug: 'free' });

      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(session);
      mockSubRepo.getActiveSubscriptionForUpdate.mockResolvedValue(currentSub);
      mockSubRepo.getPlanById
        .mockResolvedValueOnce(BASIC_PLAN)
        .mockResolvedValueOnce(FREE_PLAN);
      mockSubRepo.updateSubscription.mockResolvedValue(undefined);
      mockSubRepo.createPayment.mockResolvedValue(undefined);
      mockSubRepo.logEvent.mockResolvedValue(undefined);
      mockCheckoutRepo.updateStatus.mockResolvedValue(undefined);

      const event: WebhookEvent = {
        type: 'payment_success',
        providerSessionId: 'pp-session-1',
        rawPayload: {},
      };

      await service.handlePaymentSuccess(event);
      expect(mockSubRepo.updateSubscription).toHaveBeenCalledTimes(1);

      // Second webhook arrives, session is now completed
      vi.clearAllMocks();
      const completedSession = createCheckoutSession({ status: 'completed' });
      mockCheckoutRepo.getByProviderSessionId.mockResolvedValue(completedSession);

      await service.handlePaymentSuccess(event);

      // Should NOT process again
      expect(mockSubRepo.updateSubscription).not.toHaveBeenCalled();
      expect(mockSubRepo.createPayment).not.toHaveBeenCalled();
    });
  });
});
