import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import type { UseCase } from '../../../core/use-case.js';
import { PgAuthRepository } from '../auth.repository.js';
import type { User } from '../auth.types.js';
import { UnauthorizedError, ValidationError } from '../../../core/errors/app-error.js';
import { env } from '../../../config/env.js';

export class MergeEmailToGoogleUseCase implements UseCase<User, [string, string]> {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }

  async execute(idToken: string, newPassword: string): Promise<User> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new ValidationError('Invalid Google token');
    }

    const { sub: googleId } = payload;

    const user = await PgAuthRepository.findByGoogleId(googleId);
    if (!user) {
      throw new UnauthorizedError('No account found');
    }

    if (user.passwordHash) {
      throw new ValidationError('Account already has a password');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new ValidationError('Password must contain at least one number');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    return PgAuthRepository.setPassword(user.id, passwordHash);
  }
}
