import { OAuth2Client } from 'google-auth-library';
import type { UseCase } from '../../../core/use-case.js';
import { PgAuthRepository } from '../auth.repository.js';
import type { User } from '../auth.types.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../../core/errors/app-error.js';
import { env } from '../../../config/env.js';
import { ErrorCode } from '@mise/shared';

export class GoogleAuthUseCase implements UseCase<User, [string]> {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }

  async execute(idToken: string): Promise<User> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new ValidationError('Invalid Google token', ErrorCode.AUTH_INVALID_GOOGLE_TOKEN);
    }

    const { email, name, sub: googleId } = payload;

    // 1. User already linked to this google_id -> login
    const existingByGoogle = await PgAuthRepository.findByGoogleId(googleId);
    if (existingByGoogle) {
      return existingByGoogle;
    }

    // 2. User with this email exists + has password but no google_id -> merge required
    const existingByEmail = await PgAuthRepository.findByEmail(email);
    if (existingByEmail) {
      if (existingByEmail.passwordHash && !existingByEmail.googleId) {
        throw new ConflictError('Account uses email sign-in', ErrorCode.AUTH_MERGE_REQUIRED_GOOGLE);
      }
      throw new ConflictError('Account configuration error', ErrorCode.AUTH_ACCOUNT_CONFIG_ERROR);
    }

    // 3. No user found -> invitation-only, reject
    throw new UnauthorizedError('No account found', ErrorCode.AUTH_NO_ACCOUNT_FOUND);
  }
}
