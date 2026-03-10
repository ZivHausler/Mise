import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { UnauthorizedError } from '../../../src/core/errors/app-error.js';

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

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
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

import bcrypt from 'bcrypt';
import { PgAuthRepository } from '../../../src/modules/auth/auth.repository.js';
import { PgPasswordResetRepository } from '../../../src/modules/auth/password-reset.repository.js';
import { ResetPasswordUseCase } from '../../../src/modules/auth/use-cases/resetPassword.js';

const RAW_TOKEN = 'a'.repeat(64);
const TOKEN_HASH = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex');

function createResetToken(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    userId: 42,
    tokenHash: TOKEN_HASH,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ResetPasswordUseCase();
  });

  it('should reset password for valid token', async () => {
    const resetToken = createResetToken();
    vi.mocked(PgPasswordResetRepository.findValidByHash).mockResolvedValue(resetToken);
    vi.mocked(bcrypt.hash).mockResolvedValue('HASHED_NEW_PASSWORD' as never);
    vi.mocked(PgAuthRepository.setPassword).mockResolvedValue({} as never);
    vi.mocked(PgPasswordResetRepository.markUsed).mockResolvedValue(undefined);
    vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mockResolvedValue(undefined);

    await useCase.execute(RAW_TOKEN, 'NewSecurePass1!');

    expect(PgPasswordResetRepository.findValidByHash).toHaveBeenCalledWith(TOKEN_HASH);
    expect(PgAuthRepository.setPassword).toHaveBeenCalledWith(42, 'HASHED_NEW_PASSWORD');
    expect(PgPasswordResetRepository.markUsed).toHaveBeenCalledWith(1);
    expect(PgPasswordResetRepository.invalidateAllForUser).toHaveBeenCalledWith(42);
  });

  it('should throw AUTH_RESET_TOKEN_INVALID for invalid/expired token', async () => {
    vi.mocked(PgPasswordResetRepository.findValidByHash).mockResolvedValue(null);

    await expect(
      useCase.execute('nonexistent-token', 'NewPass1!'),
    ).rejects.toThrow(UnauthorizedError);

    await expect(
      useCase.execute('nonexistent-token', 'NewPass1!'),
    ).rejects.toThrow('Invalid or expired reset token');

    // Verify no password change or token updates happened
    expect(PgAuthRepository.setPassword).not.toHaveBeenCalled();
    expect(PgPasswordResetRepository.markUsed).not.toHaveBeenCalled();
  });

  it('should hash new password with bcrypt before storing', async () => {
    const resetToken = createResetToken();
    vi.mocked(PgPasswordResetRepository.findValidByHash).mockResolvedValue(resetToken);
    vi.mocked(bcrypt.hash).mockResolvedValue('BCRYPT_RESULT' as never);
    vi.mocked(PgAuthRepository.setPassword).mockResolvedValue({} as never);
    vi.mocked(PgPasswordResetRepository.markUsed).mockResolvedValue(undefined);
    vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mockResolvedValue(undefined);

    await useCase.execute(RAW_TOKEN, 'MyNewPassword1!');

    // bcrypt.hash should be called with the raw password and salt rounds 12
    expect(bcrypt.hash).toHaveBeenCalledWith('MyNewPassword1!', 12);
    // setPassword should receive the bcrypt output, not the raw password
    expect(PgAuthRepository.setPassword).toHaveBeenCalledWith(42, 'BCRYPT_RESULT');
  });

  it('should mark token as used after successful reset', async () => {
    const resetToken = createResetToken({ id: 99 });
    vi.mocked(PgPasswordResetRepository.findValidByHash).mockResolvedValue(resetToken);
    vi.mocked(bcrypt.hash).mockResolvedValue('HASH' as never);
    vi.mocked(PgAuthRepository.setPassword).mockResolvedValue({} as never);
    vi.mocked(PgPasswordResetRepository.markUsed).mockResolvedValue(undefined);
    vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mockResolvedValue(undefined);

    await useCase.execute(RAW_TOKEN, 'Pass1!');

    expect(PgPasswordResetRepository.markUsed).toHaveBeenCalledWith(99);

    // markUsed should be called after setPassword
    const setPasswordOrder = vi.mocked(PgAuthRepository.setPassword).mock.invocationCallOrder[0];
    const markUsedOrder = vi.mocked(PgPasswordResetRepository.markUsed).mock.invocationCallOrder[0];
    expect(markUsedOrder).toBeGreaterThan(setPasswordOrder);
  });

  it('should invalidate all other tokens for the user after reset', async () => {
    const resetToken = createResetToken({ userId: 77 });
    vi.mocked(PgPasswordResetRepository.findValidByHash).mockResolvedValue(resetToken);
    vi.mocked(bcrypt.hash).mockResolvedValue('HASH' as never);
    vi.mocked(PgAuthRepository.setPassword).mockResolvedValue({} as never);
    vi.mocked(PgPasswordResetRepository.markUsed).mockResolvedValue(undefined);
    vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mockResolvedValue(undefined);

    await useCase.execute(RAW_TOKEN, 'Pass1!');

    expect(PgPasswordResetRepository.invalidateAllForUser).toHaveBeenCalledWith(77);

    // invalidateAllForUser should be called after markUsed
    const markUsedOrder = vi.mocked(PgPasswordResetRepository.markUsed).mock.invocationCallOrder[0];
    const invalidateOrder = vi.mocked(PgPasswordResetRepository.invalidateAllForUser).mock.invocationCallOrder[0];
    expect(invalidateOrder).toBeGreaterThan(markUsedOrder);
  });

  it('should throw for empty/missing token', async () => {
    // Empty string token will hash to a known SHA-256 value, but no matching DB record
    vi.mocked(PgPasswordResetRepository.findValidByHash).mockResolvedValue(null);

    await expect(
      useCase.execute('', 'NewPass1!'),
    ).rejects.toThrow(UnauthorizedError);

    expect(PgAuthRepository.setPassword).not.toHaveBeenCalled();
  });
});
