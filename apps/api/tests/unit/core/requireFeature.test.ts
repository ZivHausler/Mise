import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenError } from '../../../src/core/errors/app-error.js';

// Mock env with feature flags
vi.mock('../../../src/config/env.js', () => ({
  env: {
    FEATURE_PRODUCTION: '1,2,3',
    FEATURE_WHATSAPP: '*',
    FEATURE_SMS: '',
  },
}));

import { requireFeature } from '../../../src/core/middleware/requireFeature.js';

function createRequest(currentUser: Record<string, unknown> | null = null) {
  return { currentUser } as any;
}

const noop = {} as any;

describe('requireFeature', () => {
  it('should allow admin users regardless of feature flag', async () => {
    const middleware = requireFeature('production');
    const req = createRequest({ isAdmin: true, storeId: 999 });

    await expect(middleware(req, noop)).resolves.toBeUndefined();
  });

  it('should allow store when listed in comma-separated flag', async () => {
    const middleware = requireFeature('production');
    const req = createRequest({ storeId: 2 });

    await expect(middleware(req, noop)).resolves.toBeUndefined();
  });

  it('should allow all stores when flag is wildcard (*)', async () => {
    const middleware = requireFeature('whatsapp');
    const req = createRequest({ storeId: 999 });

    await expect(middleware(req, noop)).resolves.toBeUndefined();
  });

  it('should throw ForbiddenError when store not in flag list', async () => {
    const middleware = requireFeature('production');
    const req = createRequest({ storeId: 99 });

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when flag is empty string', async () => {
    const middleware = requireFeature('sms');
    const req = createRequest({ storeId: 1 });

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when no storeId', async () => {
    const middleware = requireFeature('production');
    const req = createRequest({});

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when no currentUser', async () => {
    const middleware = requireFeature('production');
    const req = createRequest(null);

    await expect(middleware(req, noop)).rejects.toThrow(ForbiddenError);
  });
});
