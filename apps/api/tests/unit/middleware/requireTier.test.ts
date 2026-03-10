import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenError } from '../../../src/core/errors/app-error.js';

// ─── Mock the subscription service ─────────────────────────────
const mockGetStoreFeatures = vi.fn();

vi.mock('../../../src/modules/subscription/subscription.service.js', () => ({
  SubscriptionService: vi.fn(),
}));

// Import after mock setup
import { requireTier, setSubscriptionService, isTierFeatureEnabled } from '../../../src/core/middleware/requireTier.js';

const noop = {} as any;

function createRequest(currentUser: Record<string, unknown> | null = null) {
  return { currentUser } as any;
}

describe('requireTier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Wire up the mock service
    setSubscriptionService({ getStoreFeatures: mockGetStoreFeatures } as any);
  });

  it('should allow request when feature is in store tier', async () => {
    mockGetStoreFeatures.mockResolvedValue(['orders', 'customers', 'inventory']);
    const middleware = requireTier('inventory');
    const req = createRequest({ storeId: 10 });

    await expect(middleware(req, noop)).resolves.toBeUndefined();
    expect(mockGetStoreFeatures).toHaveBeenCalledWith(10);
  });

  it('should block request when feature is not in store tier', async () => {
    mockGetStoreFeatures.mockResolvedValue(['orders', 'customers']);
    const middleware = requireTier('analytics');
    const req = createRequest({ storeId: 10 });

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
    await expect(middleware(req, noop)).rejects.toThrow('This feature is not available on your current plan');
  });

  it('should block request when no storeId', async () => {
    const middleware = requireTier('orders');
    const req = createRequest({ userId: 1 }); // no storeId

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
    expect(mockGetStoreFeatures).not.toHaveBeenCalled();
  });

  it('should block request when currentUser is null', async () => {
    const middleware = requireTier('orders');
    const req = createRequest(null);

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
  });

  it('should NOT bypass for admin users — admins are subject to store tier', async () => {
    mockGetStoreFeatures.mockResolvedValue(['orders']); // no 'analytics'
    const middleware = requireTier('analytics');
    const req = createRequest({ storeId: 10, isAdmin: true });

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
  });

  it('should allow admin users when feature IS in their store tier', async () => {
    mockGetStoreFeatures.mockResolvedValue(['orders', 'analytics']);
    const middleware = requireTier('analytics');
    const req = createRequest({ storeId: 10, isAdmin: true });

    await expect(middleware(req, noop)).resolves.toBeUndefined();
  });

  it('should work with cached features (getStoreFeatures handles caching internally)', async () => {
    // First call
    mockGetStoreFeatures.mockResolvedValue(['orders', 'customers']);
    const middleware = requireTier('orders');
    const req = createRequest({ storeId: 10 });

    await expect(middleware(req, noop)).resolves.toBeUndefined();

    // Second call — service handles cache, middleware just calls getStoreFeatures
    mockGetStoreFeatures.mockResolvedValue(['orders', 'customers']);
    await expect(middleware(req, noop)).resolves.toBeUndefined();

    expect(mockGetStoreFeatures).toHaveBeenCalledTimes(2);
  });

  it('should block request when store has empty features array', async () => {
    mockGetStoreFeatures.mockResolvedValue([]);
    const middleware = requireTier('orders');
    const req = createRequest({ storeId: 10 });

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
  });
});

describe('isTierFeatureEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSubscriptionService({ getStoreFeatures: mockGetStoreFeatures } as any);
  });

  it('should return true when feature is in store tier', async () => {
    mockGetStoreFeatures.mockResolvedValue(['orders', 'analytics']);

    const result = await isTierFeatureEnabled('analytics', 10);

    expect(result).toBe(true);
  });

  it('should return false when feature is not in store tier', async () => {
    mockGetStoreFeatures.mockResolvedValue(['orders']);

    const result = await isTierFeatureEnabled('analytics', 10);

    expect(result).toBe(false);
  });

  it('should return false when features array is empty', async () => {
    mockGetStoreFeatures.mockResolvedValue([]);

    const result = await isTierFeatureEnabled('orders', 10);

    expect(result).toBe(false);
  });
});
