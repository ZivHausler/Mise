import { getPool } from '../../../core/database/postgres.js';
import { PgAuthRepository } from '../../auth/auth.repository.js';
import type { UserPublic } from '../../auth/auth.types.js';
import type { UpdateProfileDTO } from '../settings.types.js';

export class ProfileCrud {
  static async getById(userId: number): Promise<UserPublic | null> {
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

  static async update(userId: number, data: UpdateProfileDTO): Promise<UserPublic> {
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

  static async getOnboardingStatus(userId: number): Promise<{ completedAt: string | null }> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT onboarding_completed_at FROM users WHERE id = $1',
      [userId],
    );
    return { completedAt: result.rows[0]?.onboarding_completed_at ?? null };
  }

  static async completeOnboarding(userId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET onboarding_completed_at = NOW() WHERE id = $1',
      [userId],
    );
  }

  static async resetOnboarding(userId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET onboarding_completed_at = NULL WHERE id = $1',
      [userId],
    );
  }
}
