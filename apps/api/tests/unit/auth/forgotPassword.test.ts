import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { createUser } from '../helpers/mock-factories.js';

vi.mock('../../../src/modules/auth/auth.repository.js', () => ({
  PgAuthRepository: {
    findByEmail: vi.fn(),
    setPassword: vi.fn(),
  },
}));

vi.mock('../../../src/modules/auth/password-reset.repository.js', () => ({
  PgPasswordResetRepository: {
    create: vi.fn(),
    invalidateAllForUser: vi.fn(),
    findValidByHash: vi.fn(),
    markUsed: vi.fn(),
  },
}));

vi.mock('../../../src/modules/notifications/channels/email.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/config/env.js', () => ({
  env: {
    FRONTEND_URL: 'https://test.mise.app',
  },
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { PgAuthRepository } from '../../../src/modules/auth/auth.repository.js';
import { PgPasswordResetRepository } from '../../../src/modules/auth/password-reset.repository.js';
import { sendPasswordResetEmail } from '../../../src/modules/notifications/channels/email.js';
import { ForgotPasswordUseCase } from '../../../src/modules/auth/use-cases/forgotPassword.js';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ForgotPasswordUseCase();
  });

  it('should generate token and send email for valid user with password', async () => {
    const user = createUser({ id: 42, email: 'baker@mise.com', language: 1 });
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(user);
    vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mockResolvedValue(undefined);
    vi.mocked(PgPasswordResetRepository.create).mockResolvedValue({
      id: 1,
      userId: 42,
      tokenHash: 'hashed',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
    });

    await useCase.execute('baker@mise.com');

    expect(PgAuthRepository.findByEmail).toHaveBeenCalledWith('baker@mise.com');
    expect(PgPasswordResetRepository.invalidateAllForUser).toHaveBeenCalledWith(42);
    expect(PgPasswordResetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'baker@mise.com',
        resetLink: expect.stringContaining('https://test.mise.app/reset-password/'),
        lang: 1,
      }),
    );
  });

  it('should silently succeed for non-existent email (no email sent)', async () => {
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(null);

    await useCase.execute('unknown@mise.com');

    expect(PgAuthRepository.findByEmail).toHaveBeenCalledWith('unknown@mise.com');
    expect(PgPasswordResetRepository.invalidateAllForUser).not.toHaveBeenCalled();
    expect(PgPasswordResetRepository.create).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should silently succeed for Google-only user (no password hash)', async () => {
    const googleUser = createUser({ id: 5, email: 'google@mise.com', passwordHash: null });
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(googleUser);

    await useCase.execute('google@mise.com');

    expect(PgPasswordResetRepository.invalidateAllForUser).not.toHaveBeenCalled();
    expect(PgPasswordResetRepository.create).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should invalidate existing tokens before creating new one', async () => {
    const user = createUser({ id: 10 });
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(user);
    vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mockResolvedValue(undefined);
    vi.mocked(PgPasswordResetRepository.create).mockResolvedValue({
      id: 1, userId: 10, tokenHash: 'h', expiresAt: new Date(), usedAt: null, createdAt: new Date(),
    });

    await useCase.execute('baker@mise.com');

    // invalidateAllForUser should be called before create
    const invalidateOrder = vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mock.invocationCallOrder[0];
    const createOrder = vi.mocked(PgPasswordResetRepository.create).mock.invocationCallOrder[0];
    expect(invalidateOrder).toBeLessThan(createOrder);
  });

  it('should create token with 1-hour expiry', async () => {
    const user = createUser({ id: 7 });
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(user);
    vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mockResolvedValue(undefined);
    vi.mocked(PgPasswordResetRepository.create).mockResolvedValue({
      id: 1, userId: 7, tokenHash: 'h', expiresAt: new Date(), usedAt: null, createdAt: new Date(),
    });

    const before = Date.now();
    await useCase.execute('baker@mise.com');
    const after = Date.now();

    const createCall = vi.mocked(PgPasswordResetRepository.create).mock.calls[0][0];
    const expiresAt = createCall.expiresAt.getTime();
    const oneHourMs = 60 * 60 * 1000;

    // Expiry should be ~1 hour from now (within a small tolerance)
    expect(expiresAt).toBeGreaterThanOrEqual(before + oneHourMs - 100);
    expect(expiresAt).toBeLessThanOrEqual(after + oneHourMs + 100);
  });

  it('should store SHA-256 hash of token (not raw token)', async () => {
    const user = createUser({ id: 3 });
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(user);
    vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mockResolvedValue(undefined);
    vi.mocked(PgPasswordResetRepository.create).mockResolvedValue({
      id: 1, userId: 3, tokenHash: 'h', expiresAt: new Date(), usedAt: null, createdAt: new Date(),
    });

    await useCase.execute('baker@mise.com');

    const createCall = vi.mocked(PgPasswordResetRepository.create).mock.calls[0][0];
    const storedHash = createCall.tokenHash;

    // The stored hash should be a 64-char hex string (SHA-256 output)
    expect(storedHash).toMatch(/^[a-f0-9]{64}$/);

    // The reset link should contain the raw token (also hex, 64 chars from 32 bytes)
    const emailCall = vi.mocked(sendPasswordResetEmail).mock.calls[0][0];
    const rawToken = emailCall.resetLink.split('/reset-password/')[1];
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);

    // The stored hash should be the SHA-256 of the raw token
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(storedHash).toBe(expectedHash);
  });
});
