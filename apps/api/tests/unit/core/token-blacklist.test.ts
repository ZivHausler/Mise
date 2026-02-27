import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setTokenBlacklistClient, blacklistToken, isTokenBlacklisted } from '../../../src/core/auth/token-blacklist.js';

describe('Token Blacklist', () => {
  let mockCache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('without cache client', () => {
    beforeEach(() => {
      setTokenBlacklistClient(null);
    });

    it('blacklistToken should be a no-op', async () => {
      await expect(blacklistToken('jti-123', 3600)).resolves.toBeUndefined();
    });

    it('isTokenBlacklisted should return false', async () => {
      const result = await isTokenBlacklisted('jti-123');
      expect(result).toBe(false);
    });
  });

  describe('with cache client', () => {
    beforeEach(() => {
      setTokenBlacklistClient(mockCache as any);
    });

    it('should set token in cache with correct key and TTL', async () => {
      await blacklistToken('jti-abc', 7200);

      expect(mockCache.set).toHaveBeenCalledWith('token:blacklist:jti-abc', '1', 7200);
    });

    it('should return true when token is blacklisted', async () => {
      mockCache.get.mockResolvedValue('1');

      const result = await isTokenBlacklisted('jti-abc');
      expect(result).toBe(true);
      expect(mockCache.get).toHaveBeenCalledWith('token:blacklist:jti-abc');
    });

    it('should return false when token is not blacklisted', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await isTokenBlacklisted('jti-unknown');
      expect(result).toBe(false);
    });
  });
});
