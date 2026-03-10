import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionService } from '../../../src/modules/subscription/subscription.service.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import { PaymentType, PaymentStatus } from '../../../src/modules/subscription/subscription.types.js';
import type { Plan, StoreSubscription } from '../../../src/modules/subscription/subscription.types.js';

// ─── Hoisted mocks ──────────────────────────────────────────────────
const { mockRepository, mockClient } = vi.hoisted(() => {
  const mockClient = {
    query: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
  const mockRepository = {
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
    hasPaymentToday: vi.fn(),
    getExpiredSubscriptions: vi.fn(),
    getDowngradeToPlanId: vi.fn(),
    getPayments: vi.fn(),
    getPaymentCount: vi.fn(),
  };
  return { mockRepository, mockClient };
});

vi.mock('../../../src/modules/subscription/subscription.repository.js', () => ({
  SubscriptionRepository: vi.fn().mockImplementation(() => mockRepository),
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(mockClient),
  }),
}));

// ─── Fixtures ────────────────────────────────────────────────────────
const FREE_PLAN: Plan = {
  id: 1, slug: 'free', name: 'Free', nameHe: 'חינם',
  priceNis: 0, features: ['orders', 'customers'], sortOrder: 0, isActive: true,
};

const BASIC_PLAN: Plan = {
  id: 2, slug: 'basic', name: 'Basic', nameHe: 'בסיסי',
  priceNis: 49, features: ['orders', 'customers', 'inventory', 'recipes'], sortOrder: 1, isActive: true,
};

const PRO_PLAN: Plan = {
  id: 3, slug: 'pro', name: 'Pro', nameHe: 'פרו',
  priceNis: 99, features: ['orders', 'customers', 'inventory', 'recipes', 'analytics', 'ai_chat', 'whatsapp'],
  sortOrder: 2, isActive: true,
};

function createSub(overrides?: Partial<StoreSubscription>): StoreSubscription {
  return {
    id: 1, storeId: 10, planId: 1, planSlug: 'free', planName: 'Free',
    planNameHe: 'חינם', priceNis: 0, status: 'active',
    trialEndsAt: null,
    currentPeriodStart: '2026-03-01T00:00:00.000Z',
    currentPeriodEnd: '2026-03-31T00:00:00.000Z',
    cancelAtPeriodEnd: false, downgradeToSlug: null,
    billingAnchorDay: null,
    features: ['orders', 'customers'],
    paymentProvider: null,
    providerSubscriptionId: null,
    gracePeriodEnd: null,
    paymentFailedCount: 0,
    ...overrides,
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

describe('SubscriptionService - Billing', () => {
  let service: SubscriptionService;
  let cache: ReturnType<typeof createMockCache>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockResolvedValue(undefined);
    cache = createMockCache();
    service = new SubscriptionService(cache as any);
  });

  // ─── subscribe - upgrades ──────────────────────────────────────

  describe('subscribe - upgrades (require checkout)', () => {
    it('should reject upgrade from Free to Basic with PAYMENT_REQUIRED', async () => {
      const currentSub = createSub({ id: 1, planId: FREE_PLAN.id, planSlug: 'free' });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(FREE_PLAN);

      await expect(service.subscribe(10, 'basic', 1)).rejects.toThrow(/checkout/i);
      expect(mockRepository.createPayment).not.toHaveBeenCalled();
    });

    it('should reject upgrade from Basic to Pro with PAYMENT_REQUIRED', async () => {
      const currentSub = createSub({
        id: 5, planId: BASIC_PLAN.id, planSlug: 'basic', priceNis: 49,
        currentPeriodStart: '2026-03-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-31T00:00:00.000Z',
        billingAnchorDay: 1,
      });

      mockRepository.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(BASIC_PLAN);

      await expect(service.subscribe(10, 'pro', 1)).rejects.toThrow(/checkout/i);
      expect(mockRepository.createPayment).not.toHaveBeenCalled();
    });

    it('should cancel pending downgrade when subscribing to same plan (not an upgrade)', async () => {
      const currentSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro', priceNis: 99,
        cancelAtPeriodEnd: true, downgradeToSlug: 'basic',
        currentPeriodStart: '2026-03-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-31T00:00:00.000Z',
        billingAnchorDay: 1,
      });

      mockRepository.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);
      const afterCancelSub = createSub({ id: 5, planId: PRO_PLAN.id, planSlug: 'pro', cancelAtPeriodEnd: false, downgradeToSlug: null });
      mockRepository.getActiveSubscription.mockResolvedValue(afterCancelSub);

      const result = await service.subscribe(10, 'pro', 1);

      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          cancelAtPeriodEnd: false,
          downgradeToPlanId: null,
        }),
        mockClient,
      );

      expect(mockRepository.logEvent).toHaveBeenCalledWith(
        10, 5, 'downgrade_canceled',
        PRO_PLAN.id, PRO_PLAN.id,
        expect.objectContaining({ actorUserId: 1 }),
        mockClient,
      );

      expect(result).toEqual(afterCancelSub);
    });

    it('should reject duplicate upgrade to same plan (idempotency via same-plan check)', async () => {
      const currentSub = createSub({ id: 1, planId: BASIC_PLAN.id, planSlug: 'basic' });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValue(currentSub);

      await expect(service.subscribe(10, 'basic', 1)).rejects.toThrow('already on this plan');
      expect(mockRepository.createPayment).not.toHaveBeenCalled();
    });
  });

  // ─── subscribe - downgrades ────────────────────────────────────

  describe('subscribe - downgrades', () => {
    it('should downgrade from Pro to Basic: set pending downgrade, no payment', async () => {
      const currentSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro', priceNis: 99,
        currentPeriodStart: '2026-03-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-31T00:00:00.000Z',
      });
      const updatedSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        cancelAtPeriodEnd: true, downgradeToSlug: 'basic',
      });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);
      mockRepository.getActiveSubscription.mockResolvedValue(updatedSub);

      const result = await service.subscribe(10, 'basic', 1);

      // Should set cancelAtPeriodEnd and downgradeToPlanId
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          cancelAtPeriodEnd: true,
          downgradeToPlanId: BASIC_PLAN.id,
        }),
        mockClient,
      );

      // Should NOT create any payment
      expect(mockRepository.createPayment).not.toHaveBeenCalled();

      // Should log downgrade_scheduled
      expect(mockRepository.logEvent).toHaveBeenCalledWith(
        10, 5, 'downgrade_scheduled',
        PRO_PLAN.id, BASIC_PLAN.id,
        expect.objectContaining({ actorUserId: 1, effectiveDate: currentSub.currentPeriodEnd }),
        mockClient,
      );

      expect(result).toEqual(updatedSub);
    });

    it('should downgrade from Pro to Free: same pending logic', async () => {
      const currentSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro', priceNis: 99,
        currentPeriodStart: '2026-03-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-31T00:00:00.000Z',
      });
      const updatedSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        cancelAtPeriodEnd: true, downgradeToSlug: 'free',
      });

      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);
      mockRepository.getActiveSubscription.mockResolvedValue(updatedSub);

      await service.subscribe(10, 'free', 1);

      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          cancelAtPeriodEnd: true,
          downgradeToPlanId: FREE_PLAN.id,
        }),
        mockClient,
      );
      expect(mockRepository.createPayment).not.toHaveBeenCalled();
    });

    it('should change downgrade target: Pro->Free pending, then change to Pro->Basic pending', async () => {
      // Already has a pending downgrade to free
      const currentSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro', priceNis: 99,
        cancelAtPeriodEnd: true, downgradeToSlug: 'free',
        currentPeriodStart: '2026-03-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-31T00:00:00.000Z',
      });
      const updatedSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        cancelAtPeriodEnd: true, downgradeToSlug: 'basic',
      });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);
      mockRepository.getActiveSubscription.mockResolvedValue(updatedSub);

      await service.subscribe(10, 'basic', 1);

      // Should overwrite the downgrade target
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ downgradeToPlanId: BASIC_PLAN.id }),
        mockClient,
      );

      // Should log pending_plan_changed
      expect(mockRepository.logEvent).toHaveBeenCalledWith(
        10, 5, 'pending_plan_changed',
        PRO_PLAN.id, BASIC_PLAN.id,
        expect.objectContaining({ actorUserId: 1 }),
        mockClient,
      );
    });

    it('should reject same-plan subscription when no pending downgrade', async () => {
      const currentSub = createSub({ planId: BASIC_PLAN.id, planSlug: 'basic' });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValue(currentSub);

      await expect(service.subscribe(10, 'basic', 1)).rejects.toThrow(ValidationError);
    });
  });

  // ─── cancelDowngrade ───────────────────────────────────────────

  describe('cancelDowngrade', () => {
    it('should clear pending downgrade flags', async () => {
      const currentSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        cancelAtPeriodEnd: true, downgradeToSlug: 'basic',
      });
      const afterSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        cancelAtPeriodEnd: false, downgradeToSlug: null,
      });

      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);
      mockRepository.getActiveSubscription.mockResolvedValue(afterSub);

      const result = await service.cancelDowngrade(10, 1);

      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        5,
        { cancelAtPeriodEnd: false, downgradeToPlanId: null },
        mockClient,
      );
      expect(result).toEqual(afterSub);
    });

    it('should throw ValidationError when no pending downgrade exists', async () => {
      const currentSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        cancelAtPeriodEnd: false, downgradeToSlug: null,
      });

      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);

      await expect(service.cancelDowngrade(10, 1)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when no subscription exists', async () => {
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(null);

      await expect(service.cancelDowngrade(10, 1)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── previewChange ─────────────────────────────────────────────

  describe('previewChange', () => {
    it('should preview upgrade with correct proration', async () => {
      const currentSub = createSub({
        id: 5, planId: BASIC_PLAN.id, planSlug: 'basic', priceNis: 49,
        currentPeriodStart: '2026-03-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-31T00:00:00.000Z',
        billingAnchorDay: 1,
      });

      mockRepository.getActiveSubscription.mockResolvedValue(currentSub);
      mockRepository.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockRepository.getPlanById.mockResolvedValue(BASIC_PLAN);

      const result = await service.previewChange(10, 'pro');

      expect(result.type).toBe('upgrade');
      expect(result.currentPlan).toBe('basic');
      expect(result.targetPlan).toBe('pro');
      expect(result.immediateChargeAgorot).toBeGreaterThan(0);
      expect(result.nextRenewalAmountAgorot).toBe(9900); // Pro full price
    });

    it('should preview downgrade with correct effective date', async () => {
      const currentSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro', priceNis: 99,
        currentPeriodStart: '2026-03-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-31T00:00:00.000Z',
        billingAnchorDay: 1,
      });

      mockRepository.getActiveSubscription.mockResolvedValue(currentSub);
      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);

      const result = await service.previewChange(10, 'basic');

      expect(result.type).toBe('downgrade');
      expect(result.immediateChargeAgorot).toBeNull(); // no immediate charge
      expect(result.effectiveDate).toBe('2026-03-31T00:00:00.000Z');
      expect(result.nextRenewalAmountAgorot).toBe(4900); // Basic price
    });

    it('should throw ValidationError for same plan with no pending downgrade', async () => {
      const currentSub = createSub({ planId: BASIC_PLAN.id, planSlug: 'basic' });

      mockRepository.getActiveSubscription.mockResolvedValue(currentSub);
      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);

      await expect(service.previewChange(10, 'basic')).rejects.toThrow(ValidationError);
    });

    it('should preview trial_selection for trial user', async () => {
      const trialSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        status: 'trialing',
        trialEndsAt: '2026-03-20T00:00:00.000Z',
      });

      mockRepository.getActiveSubscription.mockResolvedValue(trialSub);
      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);

      const result = await service.previewChange(10, 'basic');

      expect(result.type).toBe('trial_selection');
      expect(result.immediateChargeAgorot).toBeNull();
      expect(result.nextRenewalAmountAgorot).toBe(4900);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should preview free-to-paid upgrade with full price charge', async () => {
      const freeSub = createSub({ planId: FREE_PLAN.id, planSlug: 'free', priceNis: 0 });

      mockRepository.getActiveSubscription.mockResolvedValue(freeSub);
      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getPlanById.mockResolvedValue(FREE_PLAN);

      const result = await service.previewChange(10, 'basic');

      expect(result.type).toBe('upgrade');
      expect(result.immediateChargeAgorot).toBe(4900);
      expect(result.nextRenewalAmountAgorot).toBe(4900);
    });
  });

  // ─── processPeriodEnd (via processOnePeriodEnd inline fallback) ─

  describe('period-end processing (inline fallback via getStoreSubscription)', () => {
    it('should renew active paid sub with payment provider (provider handles charge)', async () => {
      const expiredSub = createSub({
        id: 5, planId: BASIC_PLAN.id, planSlug: 'basic', priceNis: 49,
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-02-28T00:00:00.000Z', // past
        billingAnchorDay: 1,
        cancelAtPeriodEnd: false,
        paymentProvider: 'payplus',
      });
      const renewedSub = createSub({
        id: 5, planId: BASIC_PLAN.id, planSlug: 'basic',
        currentPeriodStart: '2026-03-09T00:00:00.000Z',
        currentPeriodEnd: '2026-04-01T00:00:00.000Z',
        paymentProvider: 'payplus',
      });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredSub)
        .mockResolvedValueOnce(renewedSub);

      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredSub);
      mockRepository.getDowngradeToPlanId.mockResolvedValue(null);
      mockRepository.getPlanById.mockResolvedValue(BASIC_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      // Should advance period
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: expect.any(Date),
        }),
        mockClient,
      );

      // Should NOT create payment (provider handles charge, webhook will record it)
      expect(mockRepository.createPayment).not.toHaveBeenCalled();

      // Should log renewal
      expect(mockRepository.logEvent).toHaveBeenCalledWith(
        10, 5, 'renewed',
        BASIC_PLAN.id, BASIC_PLAN.id,
        expect.objectContaining({ provider: 'payplus', awaitingProviderCharge: true }),
        mockClient,
      );

      expect(result).toEqual(renewedSub);
    });

    it('should auto-downgrade paid sub without payment provider at renewal', async () => {
      const expiredSub = createSub({
        id: 5, planId: BASIC_PLAN.id, planSlug: 'basic', priceNis: 49,
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-02-28T00:00:00.000Z',
        billingAnchorDay: 1,
        cancelAtPeriodEnd: false,
        paymentProvider: null,
      });
      const freeSub = createSub({ id: 6, planId: FREE_PLAN.id, planSlug: 'free' });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredSub)
        .mockResolvedValueOnce(freeSub);

      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredSub);
      mockRepository.getDowngradeToPlanId.mockResolvedValue(null);
      mockRepository.getPlanById.mockResolvedValue(BASIC_PLAN);
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.expireSubscription.mockResolvedValue(undefined);
      mockRepository.createSubscription.mockResolvedValue({ id: 6 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      // Should expire and create free sub
      expect(mockRepository.expireSubscription).toHaveBeenCalledWith(5, mockClient);
      expect(mockRepository.createSubscription).toHaveBeenCalled();

      expect(result).toEqual(freeSub);
    });

    it('should process pending downgrade to paid plan at period end', async () => {
      const expiredSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro', priceNis: 99,
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-02-28T00:00:00.000Z',
        cancelAtPeriodEnd: true, downgradeToSlug: 'basic',
        billingAnchorDay: 1,
      });
      const downgradedSub = createSub({
        id: 5, planId: BASIC_PLAN.id, planSlug: 'basic',
      });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredSub)
        .mockResolvedValueOnce(downgradedSub);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredSub);
      mockRepository.getDowngradeToPlanId.mockResolvedValue(BASIC_PLAN.id);
      mockRepository.getPlanById.mockResolvedValue(BASIC_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.createPayment.mockResolvedValue({ id: 201 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      // Should switch plan, clear pending, charge new price
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          planId: BASIC_PLAN.id,
          cancelAtPeriodEnd: false,
          downgradeToPlanId: null,
        }),
        mockClient,
      );

      expect(mockRepository.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amountAgorot: 4900,
          type: PaymentType.FULL,
          toPlanId: BASIC_PLAN.id,
        }),
        mockClient,
      );

      expect(result).toEqual(downgradedSub);
    });

    it('should process pending downgrade to Free at period end: expire and create free sub', async () => {
      const expiredSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro', priceNis: 99,
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-02-28T00:00:00.000Z',
        cancelAtPeriodEnd: true, downgradeToSlug: 'free',
        billingAnchorDay: 1,
      });
      const freeSub = createSub({ id: 6, planId: FREE_PLAN.id, planSlug: 'free' });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredSub)
        .mockResolvedValueOnce(freeSub);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredSub);
      mockRepository.getDowngradeToPlanId.mockResolvedValue(FREE_PLAN.id);
      mockRepository.getPlanById.mockResolvedValue(FREE_PLAN);
      mockRepository.expireSubscription.mockResolvedValue(undefined);
      mockRepository.createSubscription.mockResolvedValue({ id: 6 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      // Should expire current sub and create free one
      expect(mockRepository.expireSubscription).toHaveBeenCalledWith(5, mockClient);
      expect(mockRepository.createSubscription).toHaveBeenCalledWith(
        10, FREE_PLAN.id, 'active', undefined, mockClient,
      );

      // Should NOT create a payment (free plan)
      expect(mockRepository.createPayment).not.toHaveBeenCalled();

      expect(result).toEqual(freeSub);
    });
  });

  // ─── Trial expiry with plan selection ──────────────────────────

  describe('processExpiredTrial - plan selection', () => {
    it('should activate Basic plan when trial expires with Basic selected', async () => {
      const expiredTrial = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        status: 'trialing',
        trialEndsAt: '2026-01-01T00:00:00.000Z',
      });
      const activatedSub = createSub({
        id: 5, planId: BASIC_PLAN.id, planSlug: 'basic', status: 'active',
      });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredTrial)
        .mockResolvedValueOnce(activatedSub);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredTrial);
      mockRepository.getDowngradeToPlanId.mockResolvedValue(BASIC_PLAN.id);
      mockRepository.getPlanById.mockResolvedValue(BASIC_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.createPayment.mockResolvedValue({ id: 300 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      // Should update to active with billing anchor
      expect(mockRepository.updateSubscription).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          status: 'active',
          planId: BASIC_PLAN.id,
          cancelAtPeriodEnd: false,
          downgradeToPlanId: null,
          billingAnchorDay: expect.any(Number),
        }),
        mockClient,
      );

      // Should charge full Basic price
      expect(mockRepository.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amountAgorot: 4900,
          type: PaymentType.FULL,
          toPlanId: BASIC_PLAN.id,
        }),
        mockClient,
      );

      expect(result).toEqual(activatedSub);
    });

    it('should activate Pro plan when trial expires with Pro selected', async () => {
      const expiredTrial = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        status: 'trialing',
        trialEndsAt: '2026-01-01T00:00:00.000Z',
      });
      const activatedSub = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro', status: 'active',
      });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredTrial)
        .mockResolvedValueOnce(activatedSub);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredTrial);
      mockRepository.getDowngradeToPlanId.mockResolvedValue(PRO_PLAN.id);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.createPayment.mockResolvedValue({ id: 301 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      // Should charge full Pro price
      expect(mockRepository.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amountAgorot: 9900,
          type: PaymentType.FULL,
          toPlanId: PRO_PLAN.id,
        }),
        mockClient,
      );

      expect(result).toEqual(activatedSub);
    });

    it('should fall to Free when trial expires with no plan selected', async () => {
      const expiredTrial = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        status: 'trialing',
        trialEndsAt: '2026-01-01T00:00:00.000Z',
      });
      const freeSub = createSub({ id: 6 });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredTrial)
        .mockResolvedValueOnce(freeSub);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredTrial);
      mockRepository.getDowngradeToPlanId.mockResolvedValue(null);
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.expireSubscription.mockResolvedValue(undefined);
      mockRepository.createSubscription.mockResolvedValue({ id: 6 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      expect(mockRepository.expireSubscription).toHaveBeenCalledWith(5, mockClient);
      expect(mockRepository.createSubscription).toHaveBeenCalled();
      expect(result).toEqual(freeSub);
    });

    it('should fall to Free when trial expires and selected plan is Free', async () => {
      const expiredTrial = createSub({
        id: 5, planId: PRO_PLAN.id, planSlug: 'pro',
        status: 'trialing',
        trialEndsAt: '2026-01-01T00:00:00.000Z',
      });
      const freeSub = createSub({ id: 6 });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredTrial)
        .mockResolvedValueOnce(freeSub);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredTrial);
      mockRepository.getDowngradeToPlanId.mockResolvedValue(FREE_PLAN.id);
      mockRepository.getPlanById.mockResolvedValue(FREE_PLAN); // free plan has slug 'free'
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.expireSubscription.mockResolvedValue(undefined);
      mockRepository.createSubscription.mockResolvedValue({ id: 6 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      // When selected plan is free, it should fall through to the default path
      expect(mockRepository.expireSubscription).toHaveBeenCalled();
      expect(result).toEqual(freeSub);
    });
  });

  // ─── subscribe - no existing subscription ─────────────────────

  describe('subscribe - no existing subscription', () => {
    it('should reject paid plan subscription when no existing sub (requires checkout)', async () => {
      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(null);

      // No current plan means isUpgrade=true, target is paid => PAYMENT_REQUIRED
      await expect(service.subscribe(10, 'basic', 1)).rejects.toThrow(/checkout/i);
      expect(mockRepository.createPayment).not.toHaveBeenCalled();
    });
  });
});
