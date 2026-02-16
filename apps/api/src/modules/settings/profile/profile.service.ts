import type { IAuthRepository } from '../../auth/auth.repository.js';
import type { UserPublic } from '../../auth/auth.types.js';
import type { UpdateProfileDTO } from '../settings.types.js';
import { UpdateProfileUseCase } from './use-cases/updateProfile.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class ProfileService {
  private updateProfileUseCase: UpdateProfileUseCase;

  constructor(private authRepository: IAuthRepository) {
    this.updateProfileUseCase = new UpdateProfileUseCase(authRepository);
  }

  async getProfile(userId: string): Promise<UserPublic> {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileDTO): Promise<UserPublic> {
    return this.updateProfileUseCase.execute(userId, data);
  }
}
