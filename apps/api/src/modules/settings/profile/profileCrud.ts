import { PgAuthRepository } from '../../auth/auth.repository.js';
import type { UserPublic } from '../../auth/auth.types.js';
import type { UpdateProfileDTO } from '../settings.types.js';

export class ProfileCrud {
  static async getById(userId: string): Promise<UserPublic | null> {
    const user = await PgAuthRepository.findById(userId);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      isAdmin: user.isAdmin,
    };
  }

  static async update(userId: string, data: UpdateProfileDTO): Promise<UserPublic> {
    const updated = await PgAuthRepository.updateProfile(userId, {
      name: data.name,
      phone: data.phone === null ? '' : data.phone,
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      isAdmin: updated.isAdmin,
    };
  }
}
