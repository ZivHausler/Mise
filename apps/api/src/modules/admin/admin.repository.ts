import { getPool } from '../../core/database/postgres.js';
import type {
  AdminUser,
  AdminStore,
  AdminStoreMember,
  AdminInvitation,
  AdminAuditEntry,
  SignupDataPoint,
  PaginatedResult,
} from './admin.types.js';

export class PgAdminRepository {
  static async getUsers(page: number, limit: number, search?: string): Promise<PaginatedResult<AdminUser>> {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const params: unknown[] = [limit, offset];
    let whereClause = '';

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE u.email ILIKE $3 OR u.name ILIKE $3`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      search ? [params[2]] : [],
    );
    const total = parseInt(countResult.rows[0].count as string, 10);

    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.is_admin, u.disabled_at, u.created_at,
              COUNT(us.store_id)::int AS store_count
       FROM users u
       LEFT JOIN users_stores us ON us.user_id = u.id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    );

    return {
      items: result.rows.map(this.mapUserRow),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async toggleAdmin(userId: string, isAdmin: boolean): Promise<void> {
    const pool = getPool();
    await pool.query('UPDATE users SET is_admin = $1 WHERE id = $2', [isAdmin, userId]);
  }

  static async toggleDisabled(userId: string, disabled: boolean): Promise<void> {
    const pool = getPool();
    const disabledAt = disabled ? 'NOW()' : 'NULL';
    await pool.query(`UPDATE users SET disabled_at = ${disabledAt} WHERE id = $1`, [userId]);
  }

  static async getStores(page: number, limit: number, search?: string): Promise<PaginatedResult<AdminStore>> {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const params: unknown[] = [limit, offset];
    let whereClause = '';

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE s.name ILIKE $3 OR s.address ILIKE $3`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM stores s ${whereClause}`,
      search ? [params[2]] : [],
    );
    const total = parseInt(countResult.rows[0].count as string, 10);

    const result = await pool.query(
      `SELECT s.id, s.name, s.code, s.address, s.created_at,
              COUNT(us.user_id)::int AS member_count
       FROM stores s
       LEFT JOIN users_stores us ON us.store_id = s.id
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    );

    return {
      items: result.rows.map(this.mapStoreRow),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getStoreMembers(storeId: string): Promise<AdminStoreMember[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT u.id AS user_id, u.email, u.name, us.role, us.created_at AS joined_at
       FROM users_stores us
       JOIN users u ON u.id = us.user_id
       WHERE us.store_id = $1
       ORDER BY us.created_at ASC`,
      [storeId],
    );
    return result.rows.map(this.mapStoreMemberRow);
  }

  static async updateStore(storeId: string, data: { name?: string; address?: string }): Promise<void> {
    const pool = getPool();
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.address !== undefined) {
      sets.push(`address = $${idx++}`);
      params.push(data.address);
    }
    if (sets.length === 0) return;

    sets.push(`updated_at = NOW()`);
    params.push(storeId);
    await pool.query(`UPDATE stores SET ${sets.join(', ')} WHERE id = $${idx}`, params);
  }

  static async getInvitations(page: number, limit: number, status?: string): Promise<PaginatedResult<AdminInvitation>> {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const params: unknown[] = [limit, offset];
    let whereClause = '';

    if (status) {
      switch (status) {
        case 'pending':
          whereClause = 'WHERE si.used_at IS NULL AND si.revoked_at IS NULL AND si.expires_at > NOW()';
          break;
        case 'used':
          whereClause = 'WHERE si.used_at IS NOT NULL';
          break;
        case 'expired':
          whereClause = 'WHERE si.used_at IS NULL AND si.revoked_at IS NULL AND si.expires_at <= NOW()';
          break;
        case 'revoked':
          whereClause = 'WHERE si.revoked_at IS NOT NULL';
          break;
      }
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM store_invitations si ${whereClause}`,
      [],
    );
    const total = parseInt(countResult.rows[0].count as string, 10);

    const result = await pool.query(
      `SELECT si.id, si.email, si.store_id, s.name AS store_name, si.role, si.token,
              si.expires_at, si.used_at, si.revoked_at, si.created_at
       FROM store_invitations si
       LEFT JOIN stores s ON s.id = si.store_id
       ${whereClause}
       ORDER BY si.created_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    );

    return {
      items: result.rows.map(this.mapInvitationRow),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async createCreateStoreInvitation(email: string): Promise<AdminInvitation> {
    const pool = getPool();
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO store_invitations (id, store_id, email, role, token, expires_at, created_at)
       VALUES (gen_random_uuid(), NULL, $1, 1, $2, NOW() + INTERVAL '7 days', NOW())
       RETURNING *`,
      [email, token],
    );
    // Need to re-query to get the joined store_name
    return this.mapInvitationRow({ ...result.rows[0], store_name: null });
  }

  static async revokeInvitation(invitationId: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE store_invitations SET revoked_at = NOW() WHERE id = $1',
      [invitationId],
    );
  }

  static async getAuditLog(
    page: number,
    limit: number,
    filters: { userId?: string; method?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PaginatedResult<AdminAuditEntry>> {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [limit, offset];
    let idx = 3;

    if (filters.userId) {
      conditions.push(`al.user_id = $${idx++}`);
      params.push(filters.userId);
    }
    if (filters.method) {
      conditions.push(`al.method = $${idx++}`);
      params.push(filters.method.toUpperCase());
    }
    if (filters.dateFrom) {
      conditions.push(`al.created_at >= $${idx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`al.created_at <= $${idx++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM admin_audit_log al ${whereClause}`,
      params.slice(2),
    );
    const total = parseInt(countResult.rows[0].count as string, 10);

    const result = await pool.query(
      `SELECT al.id, al.user_id, u.email AS user_email, al.store_id, al.method, al.path,
              al.status_code, al.ip, al.created_at
       FROM admin_audit_log al
       JOIN users u ON u.id = al.user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    );

    return {
      items: result.rows.map(this.mapAuditEntryRow),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getAnalytics(dateFrom: Date): Promise<{
    totalUsers: number;
    totalStores: number;
    activeInvitations: number;
    signupsPerDay: SignupDataPoint[];
  }> {
    const pool = getPool();

    const [usersRes, storesRes, invitesRes, signupsRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query('SELECT COUNT(*)::int AS count FROM stores'),
      pool.query(
        'SELECT COUNT(*)::int AS count FROM store_invitations WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()',
      ),
      pool.query(
        `SELECT DATE(created_at) AS date, COUNT(*)::int AS count
         FROM users
         WHERE created_at >= $1
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [dateFrom],
      ),
    ]);

    return {
      totalUsers: usersRes.rows[0].count,
      totalStores: storesRes.rows[0].count,
      activeInvitations: invitesRes.rows[0].count,
      signupsPerDay: signupsRes.rows.map((row) => ({
        date: (row.date as Date).toISOString().split('T')[0],
        count: row.count as number,
      })),
    };
  }

  static async findUserById(userId: string): Promise<{ id: string; isAdmin: boolean } | null> {
    const pool = getPool();
    const result = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [userId]);
    if (!result.rows[0]) return null;
    return { id: result.rows[0].id as string, isAdmin: result.rows[0].is_admin as boolean };
  }

  static async findInvitationById(id: string): Promise<{ usedAt: Date | null; revokedAt: Date | null; expiresAt: Date } | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT used_at, revoked_at, expires_at FROM store_invitations WHERE id = $1',
      [id],
    );
    if (!result.rows[0]) return null;
    return {
      usedAt: result.rows[0].used_at as Date | null,
      revokedAt: result.rows[0].revoked_at as Date | null,
      expiresAt: result.rows[0].expires_at as Date,
    };
  }

  private static mapUserRow(row: Record<string, unknown>): AdminUser {
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      isAdmin: row.is_admin as boolean,
      disabledAt: row.disabled_at ? new Date(row.disabled_at as string) : null,
      createdAt: new Date(row.created_at as string),
      storeCount: (row.store_count as number) ?? 0,
    };
  }

  private static mapStoreRow(row: Record<string, unknown>): AdminStore {
    return {
      id: row.id as string,
      name: row.name as string,
      code: (row.code as string) ?? null,
      address: (row.address as string) ?? null,
      createdAt: new Date(row.created_at as string),
      memberCount: (row.member_count as number) ?? 0,
    };
  }

  private static mapStoreMemberRow(row: Record<string, unknown>): AdminStoreMember {
    return {
      userId: row.user_id as string,
      email: row.email as string,
      name: row.name as string,
      role: row.role as number,
      joinedAt: new Date(row.joined_at as string),
    };
  }

  private static mapInvitationRow(row: Record<string, unknown>): AdminInvitation {
    const usedAt = row.used_at ? new Date(row.used_at as string) : null;
    const revokedAt = row.revoked_at ? new Date(row.revoked_at as string) : null;
    const expiresAt = new Date(row.expires_at as string);

    let status: AdminInvitation['status'] = 'pending';
    if (usedAt) status = 'used';
    else if (revokedAt) status = 'revoked';
    else if (expiresAt <= new Date()) status = 'expired';

    return {
      id: row.id as string,
      email: row.email as string,
      storeId: (row.store_id as string) ?? null,
      storeName: (row.store_name as string) ?? null,
      role: row.role as number,
      token: row.token as string,
      status,
      expiresAt,
      usedAt,
      revokedAt,
      createdAt: new Date(row.created_at as string),
    };
  }

  private static mapAuditEntryRow(row: Record<string, unknown>): AdminAuditEntry {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      userEmail: row.user_email as string,
      storeId: (row.store_id as string) ?? null,
      method: row.method as string,
      path: row.path as string,
      statusCode: row.status_code as number,
      ip: row.ip as string,
      createdAt: new Date(row.created_at as string),
    };
  }
}
