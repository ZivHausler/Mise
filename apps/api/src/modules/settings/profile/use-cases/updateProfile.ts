import type { IAuthRepository } from '../../../modules/auth/auth.repository.js';
import type { UserPublic } from '../../../modules/auth/auth.types.js';
import type { UpdateProfileDTO } from '../../settings/settings.types.js';
import { NotFoundError, ValidationError } from '../../../../core/errors/app-error.js';

export class UpdateProfileUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(userId: string, data: UpdateProfileDTO): Promise<UserPublic> {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const updated = await this.authRepository.updateProfile(userId, {
      name: data.name,
      phone: data.phone === null ? '' : data.phone,
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      role: updated.role,
    };
  }
}
