import bcrypt from 'bcrypt';
import type { UseCase } from '../../../core/use-case.js';
import { PgAuthRepository } from '../auth.repository.js';
import type { RegisterDTO, User } from '../auth.types.js';
import { ConflictError, ValidationError } from '../../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class RegisterUserUseCase implements UseCase<User, [RegisterDTO]> {
  async execute(data: RegisterDTO): Promise<User> {
    if (data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', ErrorCode.AUTH_PASSWORD_TOO_SHORT);
    }
    if (!/[A-Z]/.test(data.password)) {
      throw new ValidationError('Password must contain at least one uppercase letter', ErrorCode.AUTH_PASSWORD_NO_UPPERCASE);
    }
    if (!/[0-9]/.test(data.password)) {
      throw new ValidationError('Password must contain at least one number', ErrorCode.AUTH_PASSWORD_NO_NUMBER);
    }

    const existing = await PgAuthRepository.findByEmail(data.email);
    if (existing) {
      if (existing.googleId && !existing.passwordHash) {
        throw new ConflictError('Account exists with Google sign-in', ErrorCode.AUTH_ACCOUNT_EXISTS_GOOGLE);
      }
      throw new ConflictError('A user with this email already exists', ErrorCode.AUTH_ACCOUNT_EXISTS_EMAIL);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    return PgAuthRepository.create({ ...data, passwordHash });
  }
}
