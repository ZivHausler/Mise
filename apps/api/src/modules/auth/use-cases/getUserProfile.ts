import type { UseCase } from '../../../core/use-case.js';
import { PgAuthRepository } from '../auth.repository.js';
import type { User } from '../auth.types.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class GetUserProfileUseCase implements UseCase<User, [number]> {
  async execute(userId: number): Promise<User> {
    const user = await PgAuthRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }
}
