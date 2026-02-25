import { OAuth2Client } from 'google-auth-library';
import type { UseCase } from '../../../core/use-case.js';
import { PgAuthRepository } from '../auth.repository.js';
import type { User } from '../auth.types.js';
import { ConflictError, ValidationError } from '../../../core/errors/app-error.js';
import { env } from '../../../config/env.js';
import { ErrorCode } from '@mise/shared';

export class GoogleRegisterUseCase implements UseCase<User, [string]> {
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

    // If user already exists, reject — they should use login instead
    const existingByGoogle = await PgAuthRepository.findByGoogleId(googleId);
    if (existingByGoogle) {
      throw new ConflictError('An account with this Google account already exists', ErrorCode.AUTH_ACCOUNT_EXISTS_GOOGLE);
    }

    const existingByEmail = await PgAuthRepository.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictError('An account with this email already exists', ErrorCode.AUTH_ACCOUNT_EXISTS_EMAIL);
    }

    // Create new user with Google
    return PgAuthRepository.createWithGoogle({
      email,
      name: name ?? email.split('@')[0] ?? email,
      googleId,
    });
  }
}
