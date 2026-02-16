import type { User, RegisterDTO } from './auth.types.js';

export interface IAuthRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: RegisterDTO & { passwordHash: string }): Promise<User>;
  updateProfile(userId: string, data: { name?: string; phone?: string }): Promise<User>;
}

import { getPool } from '../../core/database/postgres.js';

export class PgAuthRepository implements IAuthRepository {
  async findById(id: string): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, password_hash, name, phone, role, created_at, updated_at FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, password_hash, name, phone, role, created_at, updated_at FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async create(data: RegisterDTO & { passwordHash: string }): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'admin', NOW(), NOW())
       RETURNING id, email, password_hash, name, phone, role, created_at, updated_at`,
      [data.email, data.passwordHash, data.name],
    );
    return this.mapRow(result.rows[0]);
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }): Promise<User> {
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

    if (fields.length === 0) {
      const user = await this.findById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, email, password_hash, name, phone, role, created_at, updated_at`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): User {
    return {
      id: row['id'] as string,
      email: row['email'] as string,
      passwordHash: row['password_hash'] as string,
      name: row['name'] as string,
      phone: (row['phone'] as string) || undefined,
      role: row['role'] as User['role'],
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
