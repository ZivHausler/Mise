import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PgAuthRepository } from '../auth.repository.js';
import { PgPasswordResetRepository } from '../password-reset.repository.js';
import { UnauthorizedError, ValidationError } from '../../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class ResetPasswordUseCase {
  async execute(token: string, newPassword: string): Promise<void> {
    // Server-side password complexity validation
    if (!/[A-Z]/.test(newPassword)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new ValidationError('Password must contain at least one number');
    }

    // Hash the incoming token and look up
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await PgPasswordResetRepository.findValidByHash(tokenHash);

    if (!resetToken) {
      throw new UnauthorizedError('Invalid or expired reset token', ErrorCode.AUTH_RESET_TOKEN_INVALID);
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await PgAuthRepository.setPassword(resetToken.userId, passwordHash);

    // Mark this token as used and invalidate all others
    await PgPasswordResetRepository.markUsed(resetToken.id);
    await PgPasswordResetRepository.invalidateAllForUser(resetToken.userId);
  }
}
