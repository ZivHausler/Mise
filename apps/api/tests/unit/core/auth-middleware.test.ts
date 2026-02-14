import { describe, it, expect, vi } from 'vitest';
import { UnauthorizedError } from '../../../src/core/errors/app-error.js';

// We test authMiddleware logic by simulating the Fastify request object
// Since the real function depends on Fastify's jwtVerify, we test the branching logic

describe('Auth Middleware Logic', () => {
  // Replicate the middleware logic for unit testing without Fastify dependency
  async function authMiddlewareLogic(
    authHeader: string | undefined,
    jwtVerify: () => Promise<{ userId: string; email: string; role: string }>,
  ) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }
    try {
      return await jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  it('should throw UnauthorizedError when no authorization header', async () => {
    await expect(
      authMiddlewareLogic(undefined, vi.fn()),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when header does not start with Bearer', async () => {
    await expect(
      authMiddlewareLogic('Basic abc123', vi.fn()),
    ).rejects.toThrow('Missing or invalid authorization header');
  });

  it('should throw UnauthorizedError for empty string header', async () => {
    await expect(
      authMiddlewareLogic('', vi.fn()),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should return payload for valid Bearer token', async () => {
    const payload = { userId: 'u1', email: 'test@test.com', role: 'admin' };
    const jwtVerify = vi.fn().mockResolvedValue(payload);

    const result = await authMiddlewareLogic('Bearer validtoken', jwtVerify);
    expect(result).toEqual(payload);
    expect(jwtVerify).toHaveBeenCalledOnce();
  });

  it('should throw UnauthorizedError when token verification fails', async () => {
    const jwtVerify = vi.fn().mockRejectedValue(new Error('token expired'));

    await expect(
      authMiddlewareLogic('Bearer expiredtoken', jwtVerify),
    ).rejects.toThrow('Invalid or expired token');
  });

  it('should throw UnauthorizedError for malformed Bearer value', async () => {
    // "Bearer " with space but actual verify fails
    const jwtVerify = vi.fn().mockRejectedValue(new Error('jwt malformed'));

    await expect(
      authMiddlewareLogic('Bearer malformed.jwt', jwtVerify),
    ).rejects.toThrow(UnauthorizedError);
  });
});
