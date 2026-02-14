import type { IAuthRepository } from '../auth.repository.js';
import type { User } from '../auth.types.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class GetUserProfileUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }
}
