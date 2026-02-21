import type { UserPublic } from '../../auth/auth.types.js';
import type { UpdateProfileDTO } from '../settings.types.js';
import { ProfileCrud } from './profileCrud.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class ProfileService {
  async getProfile(userId: number): Promise<UserPublic> {
    const profile = await ProfileCrud.getById(userId);
    if (!profile) throw new NotFoundError('User not found');
    return profile;
  }

  async updateProfile(userId: number, data: UpdateProfileDTO): Promise<UserPublic> {
    const existing = await ProfileCrud.getById(userId);
    if (!existing) throw new NotFoundError('User not found');
    return ProfileCrud.update(userId, data);
  }

  async getOnboardingStatus(userId: number) {
    return ProfileCrud.getOnboardingStatus(userId);
  }

  async completeOnboarding(userId: number) {
    return ProfileCrud.completeOnboarding(userId);
  }

  async resetOnboarding(userId: number) {
    return ProfileCrud.resetOnboarding(userId);
  }
}
