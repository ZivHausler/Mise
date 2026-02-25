import bcrypt from 'bcrypt';
import type { UseCase } from '../../../core/use-case.js';
import { PgAuthRepository } from '../auth.repository.js';
import type { LoginDTO, User } from '../auth.types.js';
import { ConflictError, UnauthorizedError } from '../../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class LoginUserUseCase implements UseCase<User, [LoginDTO]> {
  async execute(data: LoginDTO): Promise<User> {
    const user = await PgAuthRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    if (user.googleId && !user.passwordHash) {
      throw new ConflictError('Account uses Google sign-in', ErrorCode.AUTH_MERGE_REQUIRED_EMAIL);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    return user;
  }
}
