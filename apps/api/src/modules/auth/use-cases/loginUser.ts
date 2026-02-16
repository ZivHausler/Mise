import bcrypt from 'bcrypt';
import type { IAuthRepository } from '../auth.repository.js';
import type { LoginDTO, User } from '../auth.types.js';
import { ConflictError, UnauthorizedError } from '../../../core/errors/app-error.js';

export class LoginUserUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(data: LoginDTO): Promise<User> {
    const user = await this.authRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.googleId && !user.passwordHash) {
      throw new ConflictError('MERGE_REQUIRED_EMAIL');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return user;
  }
}
