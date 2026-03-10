import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionService } from '../../../src/modules/subscription/subscription.service.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import type { Plan, StoreSubscription } from '../../../src/modules/subscription/subscription.types.js';

// ─── Hoisted mocks (vi.mock factories are hoisted above imports) ─
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
    hasPaymentToday: vi.fn().mockResolvedValue(false),
    getExpiredSubscriptions: vi.fn(),
    getDowngradeToPlanId: vi.fn().mockResolvedValue(null),
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

// ─── Fixtures ───────────────────────────────────────────────────
const FREE_PLAN: Plan = {
  id: 1,
  slug: 'free',
  name: 'Free',
  nameHe: 'חינם',
  priceNis: 0,
  features: ['orders', 'customers'],
  sortOrder: 0,
  isActive: true,
};

const BASIC_PLAN: Plan = {
  id: 2,
  slug: 'basic',
  name: 'Basic',
  nameHe: 'בסיסי',
  priceNis: 49,
  features: ['orders', 'customers', 'inventory', 'recipes'],
  sortOrder: 1,
  isActive: true,
};

const PRO_PLAN: Plan = {
  id: 3,
  slug: 'pro',
  name: 'Pro',
  nameHe: 'פרו',
  priceNis: 99,
  features: ['orders', 'customers', 'inventory', 'recipes', 'analytics', 'ai_chat', 'whatsapp'],
  sortOrder: 2,
  isActive: true,
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
    planNameHe: 'חינם',
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

// ─── Mock cache client ──────────────────────────────────────────
function createMockCache() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let cache: ReturnType<typeof createMockCache>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockResolvedValue(undefined);
    cache = createMockCache();
    service = new SubscriptionService(cache as any);
  });

  // ─── getStoreSubscription ───────────────────────────────────

  describe('getStoreSubscription', () => {
    it('should return subscription with plan details', async () => {
      const sub = createSubscription();
      mockRepository.getActiveSubscription.mockResolvedValue(sub);

      const result = await service.getStoreSubscription(10);

      expect(result).toEqual(sub);
      expect(mockRepository.getActiveSubscription).toHaveBeenCalledWith(10);
    });

    it('should throw NotFoundError when no active subscription', async () => {
      mockRepository.getActiveSubscription.mockResolvedValue(null);

      await expect(service.getStoreSubscription(10)).rejects.toThrow(NotFoundError);
    });

    it('should handle inline trial expiry and auto-downgrade to free', async () => {
      const expiredTrial = createSubscription({
        id: 5,
        planId: 3,
        planSlug: 'pro',
        status: 'trialing',
        trialEndsAt: '2026-01-01T00:00:00.000Z', // past date
        features: PRO_PLAN.features,
      });

      const freeSub = createSubscription({ id: 6 });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredTrial) // first call
        .mockResolvedValueOnce(freeSub); // after processExpiredTrial
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredTrial);
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.expireSubscription.mockResolvedValue(undefined);
      mockRepository.createSubscription.mockResolvedValue({ id: 6 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.getStoreSubscription(10);

      expect(mockRepository.expireSubscription).toHaveBeenCalled();
      expect(mockRepository.createSubscription).toHaveBeenCalled();
      expect(mockRepository.logEvent).toHaveBeenCalled();
      expect(result).toEqual(freeSub);
    });

    it('should NOT trigger trial expiry when trial is still active', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const activeTrial = createSubscription({
        planId: 3,
        planSlug: 'pro',
        status: 'trialing',
        trialEndsAt: futureDate.toISOString(),
        features: PRO_PLAN.features,
      });

      mockRepository.getActiveSubscription.mockResolvedValue(activeTrial);

      const result = await service.getStoreSubscription(10);

      expect(result).toEqual(activeTrial);
      expect(mockRepository.expireSubscription).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if subscription disappears after trial processing', async () => {
      const expiredTrial = createSubscription({
        status: 'trialing',
        trialEndsAt: '2025-01-01T00:00:00.000Z',
      });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredTrial)
        .mockResolvedValueOnce(null); // gone after processing
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredTrial);
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.expireSubscription.mockResolvedValue(undefined);
      mockRepository.createSubscription.mockResolvedValue({ id: 99 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      await expect(service.getStoreSubscription(10)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── getStoreFeatures ──────────────────────────────────────

  describe('getStoreFeatures', () => {
    it('should return features from cache when available', async () => {
      const cachedFeatures = ['orders', 'customers', 'inventory'];
      cache.get.mockResolvedValue(JSON.stringify(cachedFeatures));

      const result = await service.getStoreFeatures(10);

      expect(result).toEqual(cachedFeatures);
      expect(cache.get).toHaveBeenCalledWith('sub:features:10');
      expect(mockRepository.getActiveSubscription).not.toHaveBeenCalled();
    });

    it('should fall back to DB when cache miss', async () => {
      cache.get.mockResolvedValue(null);
      const sub = createSubscription({ features: ['orders'] });
      mockRepository.getActiveSubscription.mockResolvedValue(sub);

      const result = await service.getStoreFeatures(10);

      expect(result).toEqual(['orders']);
      expect(mockRepository.getActiveSubscription).toHaveBeenCalledWith(10);
    });

    it('should cache result after DB read', async () => {
      cache.get.mockResolvedValue(null);
      const sub = createSubscription({ features: ['orders', 'customers'] });
      mockRepository.getActiveSubscription.mockResolvedValue(sub);

      await service.getStoreFeatures(10);

      expect(cache.set).toHaveBeenCalledWith(
        'sub:features:10',
        JSON.stringify(['orders', 'customers']),
        300,
      );
    });

    it('should return empty array when no subscription found', async () => {
      cache.get.mockResolvedValue(null);
      mockRepository.getActiveSubscription.mockResolvedValue(null);

      const result = await service.getStoreFeatures(10);

      expect(result).toEqual([]);
    });

    it('should fall back to DB when cache throws an error', async () => {
      cache.get.mockRejectedValue(new Error('Redis connection failed'));
      const sub = createSubscription({ features: ['orders'] });
      mockRepository.getActiveSubscription.mockResolvedValue(sub);

      const result = await service.getStoreFeatures(10);

      expect(result).toEqual(['orders']);
    });

    it('should still return features when cache write fails', async () => {
      cache.get.mockResolvedValue(null);
      cache.set.mockRejectedValue(new Error('Redis write failed'));
      const sub = createSubscription({ features: ['orders'] });
      mockRepository.getActiveSubscription.mockResolvedValue(sub);

      const result = await service.getStoreFeatures(10);

      expect(result).toEqual(['orders']);
    });

    it('should work without cache client (null)', async () => {
      const noCacheService = new SubscriptionService(null);
      const sub = createSubscription({ features: ['orders'] });
      mockRepository.getActiveSubscription.mockResolvedValue(sub);

      const result = await noCacheService.getStoreFeatures(10);

      expect(result).toEqual(['orders']);
    });
  });

  // ─── subscribe ─────────────────────────────────────────────

  describe('subscribe', () => {
    it('should reject upgrade from free to basic with PAYMENT_REQUIRED', async () => {
      const currentSub = createSubscription({ id: 1, planId: FREE_PLAN.id, planSlug: 'free' });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(FREE_PLAN);

      await expect(service.subscribe(10, 'basic', 1)).rejects.toThrow(ValidationError);
      await expect(service.subscribe(10, 'basic', 1)).rejects.toThrow(/checkout/i);
    });

    it('should reject upgrade from basic to pro with PAYMENT_REQUIRED', async () => {
      const currentSub = createSubscription({ id: 1, planId: BASIC_PLAN.id, planSlug: 'basic' });

      mockRepository.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(BASIC_PLAN);

      await expect(service.subscribe(10, 'pro', 1)).rejects.toThrow(ValidationError);
    });

    it('should downgrade from pro to basic (pending)', async () => {
      const currentSub = createSubscription({ id: 1, planId: PRO_PLAN.id, planSlug: 'pro' });
      const updatedSub = createSubscription({
        id: 1, planId: PRO_PLAN.id, planSlug: 'pro',
        cancelAtPeriodEnd: true, downgradeToSlug: 'basic',
      });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);
      mockRepository.getActiveSubscription.mockResolvedValueOnce(updatedSub);

      const result = await service.subscribe(10, 'basic', 1);

      expect(mockRepository.logEvent).toHaveBeenCalled();
      expect(result).toEqual(updatedSub);
    });

    it('should downgrade from pro to free (pending)', async () => {
      const currentSub = createSubscription({ id: 1, planId: PRO_PLAN.id, planSlug: 'pro' });
      const updatedSub = createSubscription({
        id: 1, planId: PRO_PLAN.id, planSlug: 'pro',
        cancelAtPeriodEnd: true, downgradeToSlug: 'free',
      });

      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);
      mockRepository.getActiveSubscription.mockResolvedValueOnce(updatedSub);

      await service.subscribe(10, 'free', 1);

      expect(mockRepository.logEvent).toHaveBeenCalled();
    });

    it('should reject same-plan change', async () => {
      const currentSub = createSubscription({ planId: BASIC_PLAN.id, planSlug: 'basic' });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValue(currentSub);

      await expect(service.subscribe(10, 'basic', 1)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for invalid planSlug', async () => {
      mockRepository.getPlanBySlug.mockResolvedValue(null);

      await expect(service.subscribe(10, 'pro', 1)).rejects.toThrow(NotFoundError);
    });

    it('should invalidate cache after downgrade', async () => {
      const currentSub = createSubscription({ id: 1, planSlug: 'pro', planId: PRO_PLAN.id });
      const updatedSub = createSubscription({
        id: 1, planSlug: 'pro', planId: PRO_PLAN.id,
        cancelAtPeriodEnd: true, downgradeToSlug: 'basic',
      });

      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getPlanById.mockResolvedValue(PRO_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);
      mockRepository.getActiveSubscription.mockResolvedValueOnce(updatedSub);

      await service.subscribe(10, 'basic', 1);

      expect(cache.del).toHaveBeenCalledWith('sub:features:10');
    });

    it('should reject paid upgrade when store has no existing subscription', async () => {
      mockRepository.getPlanBySlug.mockResolvedValue(BASIC_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(null);

      // No current plan means isUpgrade=true, target is paid => PAYMENT_REQUIRED
      await expect(service.subscribe(10, 'basic', 1)).rejects.toThrow(ValidationError);
    });
  });

  // ─── cancel ────────────────────────────────────────────────

  describe('cancel', () => {
    it('should set cancelAtPeriodEnd and downgrade to free for paid plans', async () => {
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 30);
      const paidSub = createSubscription({ id: 5, planId: BASIC_PLAN.id, planSlug: 'basic' });
      const updatedSub = createSubscription({
        id: 5, planSlug: 'basic', cancelAtPeriodEnd: true, downgradeToSlug: 'free',
        currentPeriodEnd: futureEnd.toISOString(),
      });

      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(paidSub);
      mockRepository.getActiveSubscription.mockResolvedValueOnce(updatedSub);
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.cancel(10, 1);

      expect(mockRepository.updateSubscription).toHaveBeenCalled();
      expect(mockRepository.logEvent).toHaveBeenCalled();
      expect(cache.del).toHaveBeenCalledWith('sub:features:10');
      expect(result).toEqual(updatedSub);
    });

    it('should throw NotFoundError when no active subscription', async () => {
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValue(null);

      await expect(service.cancel(10, 1)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when already on free plan', async () => {
      const freeSub = createSubscription({ planSlug: 'free' });
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValue(freeSub);
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);

      await expect(service.cancel(10, 1)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when free plan does not exist in DB', async () => {
      const paidSub = createSubscription({ planSlug: 'basic' });
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValue(paidSub);
      mockRepository.getPlanBySlug.mockResolvedValue(null);

      await expect(service.cancel(10, 1)).rejects.toThrow(NotFoundError);
    });

    it('should invalidate cache after cancel', async () => {
      const paidSub = createSubscription({ id: 5, planSlug: 'basic', planId: BASIC_PLAN.id });
      const updatedSub = createSubscription({ id: 5, cancelAtPeriodEnd: true });

      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(paidSub);
      mockRepository.getActiveSubscription.mockResolvedValueOnce(updatedSub);
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.updateSubscription.mockResolvedValue(undefined);
      mockRepository.logEvent.mockResolvedValue(undefined);

      await service.cancel(10, 1);

      expect(cache.del).toHaveBeenCalledWith('sub:features:10');
    });
  });

  // ─── createTrialSubscription ───────────────────────────────

  describe('createTrialSubscription', () => {
    it('should create Pro subscription with trialing status and 14-day trial', async () => {
      mockRepository.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockRepository.createSubscription.mockResolvedValue({ id: 10 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      const beforeCall = new Date();
      await service.createTrialSubscription(10);
      const afterCall = new Date();

      expect(mockRepository.createSubscription).toHaveBeenCalledWith(
        10,
        PRO_PLAN.id,
        'trialing',
        expect.any(Date),
      );

      // Verify trial_ends_at is ~14 days from now
      const trialEndsAt: Date = mockRepository.createSubscription.mock.calls[0][3];
      const diffDays = (trialEndsAt.getTime() - beforeCall.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(13.9);
      expect(diffDays).toBeLessThanOrEqual(14.1);
    });

    it('should log trial_started event', async () => {
      mockRepository.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockRepository.createSubscription.mockResolvedValue({ id: 10 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      await service.createTrialSubscription(10);

      expect(mockRepository.logEvent).toHaveBeenCalledWith(
        10, 10, 'trial_started', null, PRO_PLAN.id, { trialDays: 14 },
      );
    });

    it('should fallback to free plan when pro plan does not exist', async () => {
      mockRepository.getPlanBySlug
        .mockResolvedValueOnce(null) // pro plan missing
        .mockResolvedValueOnce(FREE_PLAN); // free plan fallback
      mockRepository.createSubscription.mockResolvedValue({ id: 11 });

      await service.createTrialSubscription(10);

      expect(mockRepository.createSubscription).toHaveBeenCalledWith(10, FREE_PLAN.id, 'active');
      expect(mockRepository.logEvent).not.toHaveBeenCalled();
    });

    it('should do nothing when neither pro nor free plan exists', async () => {
      mockRepository.getPlanBySlug
        .mockResolvedValueOnce(null) // pro
        .mockResolvedValueOnce(null); // free

      await service.createTrialSubscription(10);

      expect(mockRepository.createSubscription).not.toHaveBeenCalled();
    });
  });

  // ─── processExpiredTrial (tested via getStoreSubscription) ─

  describe('processExpiredTrial (via getStoreSubscription)', () => {
    it('should expire trial, create free sub, and log trial_expired event', async () => {
      const expiredTrial = createSubscription({
        id: 5,
        planId: PRO_PLAN.id,
        planSlug: 'pro',
        status: 'trialing',
        trialEndsAt: '2025-01-01T00:00:00.000Z',
      });
      const freeSub = createSubscription({ id: 6 });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredTrial)  // initial getStoreSubscription
        .mockResolvedValueOnce(freeSub);      // after processExpiredTrial
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredTrial); // lock inside processExpiredTrial
      mockRepository.getPlanBySlug.mockResolvedValue(FREE_PLAN);
      mockRepository.expireSubscription.mockResolvedValue(undefined);
      mockRepository.createSubscription.mockResolvedValue({ id: 6 });
      mockRepository.logEvent.mockResolvedValue(undefined);

      await service.getStoreSubscription(10);

      expect(mockRepository.expireSubscription).toHaveBeenCalled();
      expect(mockRepository.createSubscription).toHaveBeenCalled();
      expect(mockRepository.logEvent).toHaveBeenCalled();
      expect(cache.del).toHaveBeenCalledWith('sub:features:10');
    });

    it('should silently handle missing free plan during trial expiry', async () => {
      const expiredTrial = createSubscription({
        id: 5,
        status: 'trialing',
        trialEndsAt: '2025-01-01T00:00:00.000Z',
      });

      mockRepository.getActiveSubscription
        .mockResolvedValueOnce(expiredTrial)
        .mockResolvedValueOnce(null);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(expiredTrial);
      mockRepository.getPlanBySlug.mockResolvedValue(null);
      mockRepository.expireSubscription.mockResolvedValue(undefined);

      await expect(service.getStoreSubscription(10)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── invalidateCache ──────────────────────────────────────

  describe('invalidateCache', () => {
    it('should delete cache key for store', async () => {
      await service.invalidateCache(10);

      expect(cache.del).toHaveBeenCalledWith('sub:features:10');
    });

    it('should silently handle cache deletion failure', async () => {
      cache.del.mockRejectedValue(new Error('Redis down'));

      await expect(service.invalidateCache(10)).resolves.toBeUndefined();
    });

    it('should be a no-op when cache client is null', async () => {
      const noCacheService = new SubscriptionService(null);

      await expect(noCacheService.invalidateCache(10)).resolves.toBeUndefined();
    });
  });

  // ─── adminForceChangePlan ─────────────────────────────────

  describe('adminForceChangePlan', () => {
    it('should force change plan and log with adminForced metadata', async () => {
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 30);
      const currentSub = createSubscription({ id: 1, planSlug: 'free', planId: FREE_PLAN.id });
      const newSub = createSubscription({
        id: 2, planSlug: 'pro', planId: PRO_PLAN.id,
        currentPeriodEnd: futureEnd.toISOString(),
      });

      mockRepository.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValueOnce(currentSub);
      mockRepository.getActiveSubscription.mockResolvedValueOnce(newSub);
      mockRepository.expireSubscription.mockResolvedValue(undefined);
      mockRepository.createSubscription.mockResolvedValue({ id: 2 });
      mockRepository.getPlanById.mockResolvedValue(FREE_PLAN);
      mockRepository.logEvent.mockResolvedValue(undefined);

      const result = await service.adminForceChangePlan(10, 'pro', 99);

      expect(mockRepository.logEvent).toHaveBeenCalled();
      expect(result).toEqual(newSub);
    });

    it('should reject same-plan admin force change', async () => {
      const currentSub = createSubscription({ planSlug: 'pro', planId: PRO_PLAN.id });

      mockRepository.getPlanBySlug.mockResolvedValue(PRO_PLAN);
      mockRepository.getActiveSubscriptionForUpdate.mockResolvedValue(currentSub);

      await expect(service.adminForceChangePlan(10, 'pro', 99)).rejects.toThrow(ValidationError);
    });
  });
});
