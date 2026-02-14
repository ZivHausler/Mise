import bcrypt from 'bcrypt';
import type { IAuthRepository } from '../auth.repository.js';
import type { RegisterDTO, User } from '../auth.types.js';
import { ConflictError, ValidationError } from '../../../core/errors/app-error.js';

export class RegisterUserUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(data: RegisterDTO): Promise<User> {
    if (data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(data.password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(data.password)) {
      throw new ValidationError('Password must contain at least one number');
    }

    const existing = await this.authRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.authRepository.create({ ...data, passwordHash });
  }
}
