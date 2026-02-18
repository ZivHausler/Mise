import crypto from 'crypto';
import { getPool } from '../../core/database/postgres.js';
import type { Store, UserStore, StoreInvitation, CreateStoreDTO } from './store.types.js';
import { StoreRole } from './store.types.js';

export class PgStoreRepository {
  static async createStore(data: CreateStoreDTO): Promise<Store> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO stores (id, name, code, address, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [data.name, data.code ?? null, data.address ?? null],
    );
    return this.mapStoreRow(result.rows[0]);
  }

  static async addUserToStore(userId: string, storeId: string, role: StoreRole): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users_stores (user_id, store_id, role, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, store_id) DO NOTHING`,
      [userId, storeId, role],
    );
  }

  static async getUserStores(userId: string): Promise<UserStore[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT us.user_id, us.store_id, us.role, s.name as store_name, s.code as store_code
       FROM users_stores us
       JOIN stores s ON s.id = us.store_id
       WHERE us.user_id = $1
       ORDER BY us.created_at`,
      [userId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      userId: row['user_id'] as string,
      storeId: row['store_id'] as string,
      role: row['role'] as StoreRole,
      storeName: row['store_name'] as string,
      storeCode: (row['store_code'] as string) || null,
    }));
  }

  static async getAllStores(): Promise<Store[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM stores ORDER BY name');
    return result.rows.map((row: Record<string, unknown>) => this.mapStoreRow(row));
  }

  static async getUserStoreRole(userId: string, storeId: string): Promise<StoreRole | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT role FROM users_stores WHERE user_id = $1 AND store_id = $2`,
      [userId, storeId],
    );
    return result.rows[0] ? (result.rows[0]['role'] as StoreRole) : null;
  }

  static async getStoreMembers(storeId: string): Promise<{ userId: string; email: string; name: string; role: StoreRole }[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT u.id as user_id, u.email, u.name, us.role
       FROM users_stores us
       JOIN users u ON u.id = us.user_id
       WHERE us.store_id = $1
       ORDER BY us.role, u.name`,
      [storeId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      userId: row['user_id'] as string,
      email: row['email'] as string,
      name: row['name'] as string,
      role: row['role'] as StoreRole,
    }));
  }

  static async createInvitation(storeId: string, email: string, role: StoreRole): Promise<StoreInvitation> {
    const pool = getPool();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const result = await pool.query(
      `INSERT INTO store_invitations (id, store_id, email, role, token, expires_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [storeId, email, role, token, expiresAt],
    );
    return this.mapInvitationRow(result.rows[0]);
  }

  static async findInvitationByToken(token: string): Promise<(StoreInvitation & { storeName: string | null }) | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT si.*, s.name as store_name
       FROM store_invitations si
       LEFT JOIN stores s ON s.id = si.store_id
       WHERE si.token = $1 AND si.used_at IS NULL AND si.expires_at > NOW()`,
      [token],
    );
    if (!result.rows[0]) return null;
    const inv = this.mapInvitationRow(result.rows[0]);
    return { ...inv, storeName: (result.rows[0]['store_name'] as string) || null };
  }

  static async createCreateStoreInvitation(email: string): Promise<StoreInvitation> {
    const pool = getPool();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const result = await pool.query(
      `INSERT INTO store_invitations (id, store_id, email, role, token, expires_at, created_at)
       VALUES (gen_random_uuid(), NULL, $1, $2, $3, $4, NOW())
       RETURNING *`,
      [email, StoreRole.OWNER, token, expiresAt],
    );
    return this.mapInvitationRow(result.rows[0]);
  }

  static async getPendingInvitations(storeId: string): Promise<{ email: string; role: StoreRole; token: string; createdAt: Date; expiresAt: Date }[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT email, role, token, created_at, expires_at
       FROM store_invitations
       WHERE store_id = $1 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [storeId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      email: row['email'] as string,
      role: row['role'] as StoreRole,
      token: row['token'] as string,
      createdAt: new Date(row['created_at'] as string),
      expiresAt: new Date(row['expires_at'] as string),
    }));
  }

  static async markInvitationUsed(token: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE store_invitations SET used_at = NOW() WHERE token = $1`,
      [token],
    );
  }

  private static mapStoreRow(row: Record<string, unknown>): Store {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      code: (row['code'] as string) || null,
      address: (row['address'] as string) || null,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  private static mapInvitationRow(row: Record<string, unknown>): StoreInvitation {
    return {
      id: row['id'] as string,
      storeId: (row['store_id'] as string) || null,
      email: row['email'] as string,
      role: row['role'] as StoreRole,
      token: row['token'] as string,
      expiresAt: new Date(row['expires_at'] as string),
      usedAt: row['used_at'] ? new Date(row['used_at'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
