import { getPool } from '../../core/database/postgres.js';

interface PasswordResetToken {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class PgPasswordResetRepository {
  static async create(data: { userId: number; tokenHash: string; expiresAt: Date }): Promise<PasswordResetToken> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
      [data.userId, data.tokenHash, data.expiresAt],
    );
    return this.mapRow(result.rows[0]);
  }

  static async findValidByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, user_id, token_hash, expires_at, used_at, created_at
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async markUsed(id: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [id],
    );
  }

  static async invalidateAllForUser(userId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
  }

  private static mapRow(row: Record<string, unknown>): PasswordResetToken {
    return {
      id: Number(row['id']),
      userId: Number(row['user_id']),
      tokenHash: row['token_hash'] as string,
      expiresAt: new Date(row['expires_at'] as string),
      usedAt: row['used_at'] ? new Date(row['used_at'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
