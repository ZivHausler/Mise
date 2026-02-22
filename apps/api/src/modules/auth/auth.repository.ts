import type { User, RegisterDTO } from './auth.types.js';
import { getPool } from '../../core/database/postgres.js';

const SELECT_COLS = 'id, email, password_hash, google_id, name, phone, language, is_admin, created_at, updated_at';

export class PgAuthRepository {
  static async findById(id: number): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM users WHERE email = $1`,
      [email],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM users WHERE google_id = $1`,
      [googleId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async create(data: RegisterDTO & { passwordHash: string }): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING ${SELECT_COLS}`,
      [data.email, data.passwordHash, data.name],
    );
    return this.mapRow(result.rows[0]);
  }

  static async updateProfile(userId: number, data: { name?: string; phone?: string; language?: number }): Promise<User> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (data.language !== undefined) {
      fields.push(`language = $${idx++}`);
      values.push(data.language);
    }

    if (fields.length === 0) {
      const user = await this.findById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING ${SELECT_COLS}`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  static async createWithGoogle(data: { email: string; name: string; googleId: string }): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (email, google_id, name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING ${SELECT_COLS}`,
      [data.email, data.googleId, data.name],
    );
    return this.mapRow(result.rows[0]);
  }

  static async linkGoogle(userId: number, googleId: string): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2
       RETURNING ${SELECT_COLS}`,
      [googleId, userId],
    );
    return this.mapRow(result.rows[0]);
  }

  static async setPassword(userId: number, passwordHash: string): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
       RETURNING ${SELECT_COLS}`,
      [passwordHash, userId],
    );
    return this.mapRow(result.rows[0]);
  }

  private static mapRow(row: Record<string, unknown>): User {
    return {
      id: Number(row['id']),
      email: row['email'] as string,
      passwordHash: (row['password_hash'] as string) || null,
      googleId: (row['google_id'] as string) || undefined,
      name: row['name'] as string,
      phone: (row['phone'] as string) || undefined,
      language: Number(row['language'] ?? 0),
      isAdmin: row['is_admin'] === true,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
