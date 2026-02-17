import { OAuth2Client } from 'google-auth-library';
import type { UseCase } from '../../../core/use-case.js';
import { PgAuthRepository } from '../auth.repository.js';
import type { User } from '../auth.types.js';
import { ConflictError, ValidationError } from '../../../core/errors/app-error.js';
import { env } from '../../../config/env.js';

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
      throw new ValidationError('Invalid Google token');
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
        throw new ConflictError('MERGE_REQUIRED_GOOGLE');
      }
      throw new ConflictError('Account configuration error');
    }

    // 3. No user found -> create new account via Google
    return PgAuthRepository.createWithGoogle({
      email,
      name: name ?? email.split('@')[0] ?? email,
      googleId,
    });
  }
}
