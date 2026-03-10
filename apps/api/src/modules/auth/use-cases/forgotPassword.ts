import crypto from 'crypto';
import { PgAuthRepository } from '../auth.repository.js';
import { PgPasswordResetRepository } from '../password-reset.repository.js';
import { sendPasswordResetEmail } from '../../notifications/channels/email.js';
import { env } from '../../../config/env.js';
import { appLogger } from '../../../core/logger/logger.js';

export class ForgotPasswordUseCase {
  async execute(email: string): Promise<void> {
    const user = await PgAuthRepository.findByEmail(email);

    // Silent return for non-existent users or Google-only users (no password to reset)
    // Random delay to prevent timing side-channel email enumeration
    if (!user || !user.passwordHash) {
      appLogger.info({ email }, '[AUTH] Password reset requested for non-eligible account');
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));
      return;
    }

    // Invalidate any existing unused tokens for this user
    await PgPasswordResetRepository.invalidateAllForUser(user.id);

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Store hashed token with 1-hour expiry
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await PgPasswordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Send email with raw token in the link
    const resetLink = `${env.FRONTEND_URL}/reset-password/${rawToken}`;
    await sendPasswordResetEmail({
      to: user.email,
      resetLink,
      lang: user.language,
    });
  }
}
