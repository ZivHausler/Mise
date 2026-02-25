import { getPool } from '../../core/database/postgres.js';
import type {
  AdminUser,
  AdminStore,
  AdminStoreMember,
  AdminInvitation,
  AdminAuditEntry,
  SignupDataPoint,
} from './admin.types.js';
import type { PaginatedResult } from '../../core/types/pagination.js';

export class PgAdminRepository {
  static async getUsers(page: number, limit: number, search?: string, includeAdmins = false): Promise<PaginatedResult<AdminUser>> {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const params: unknown[] = [limit, offset];
    const conditions: string[] = [];

    if (!includeAdmins) {
      conditions.push('u.is_admin = false');
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.email ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params.slice(2),
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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async toggleAdmin(userId: number, isAdmin: boolean): Promise<void> {
    const pool = getPool();
    await pool.query('UPDATE users SET is_admin = $1 WHERE id = $2', [isAdmin, userId]);
  }

  static async toggleDisabled(userId: number, disabled: boolean): Promise<void> {
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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getStoreMembers(storeId: number): Promise<AdminStoreMember[]> {
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

  static async updateStore(storeId: number, data: { name?: string; address?: string }): Promise<void> {
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

  static async getInvitations(
    page: number,
    limit: number,
    filters: { status?: string; search?: string; storeId?: number; userId?: number; email?: string; role?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PaginatedResult<AdminInvitation>> {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const filterParams: unknown[] = [];
    let idx = 1;

    if (filters.status) {
      switch (filters.status) {
        case 'pending':
          conditions.push('si.used_at IS NULL AND si.revoked_at IS NULL AND si.expires_at > NOW()');
          break;
        case 'used':
          conditions.push('si.used_at IS NOT NULL');
          break;
        case 'expired':
          conditions.push('si.used_at IS NULL AND si.revoked_at IS NULL AND si.expires_at <= NOW()');
          break;
        case 'revoked':
          conditions.push('si.revoked_at IS NOT NULL');
          break;
      }
    }

    if (filters.search) {
      conditions.push(`(si.email ILIKE $${idx} OR s.name ILIKE $${idx})`);
      filterParams.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.storeId) {
      conditions.push(`si.store_id = $${idx++}`);
      filterParams.push(filters.storeId);
    }

    if (filters.email) {
      conditions.push(`si.email = $${idx++}`);
      filterParams.push(filters.email);
    } else if (filters.userId) {
      conditions.push(`si.email = (SELECT email FROM users WHERE id = $${idx++})`);
      filterParams.push(filters.userId);
    }

    if (filters.role) {
      conditions.push(`si.role = $${idx++}`);
      filterParams.push(parseInt(filters.role, 10));
    }

    if (filters.dateFrom) {
      conditions.push(`si.created_at >= $${idx++}`);
      filterParams.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`si.created_at < ($${idx++})::date + INTERVAL '1 day'`);
      filterParams.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM store_invitations si LEFT JOIN stores s ON s.id = si.store_id ${whereClause}`,
      filterParams,
    );
    const total = parseInt(countResult.rows[0].count as string, 10);

    const queryParams = [...filterParams, limit, offset];
    const result = await pool.query(
      `SELECT si.id, si.email, si.store_id, s.name AS store_name, si.role, si.token,
              si.expires_at, si.used_at, si.revoked_at, si.created_at
       FROM store_invitations si
       LEFT JOIN stores s ON s.id = si.store_id
       ${whereClause}
       ORDER BY si.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      queryParams,
    );

    return {
      items: result.rows.map(this.mapInvitationRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getDistinctInvitationEmails(): Promise<string[]> {
    const pool = getPool();
    const result = await pool.query('SELECT DISTINCT email FROM store_invitations ORDER BY email ASC');
    return result.rows.map((row: Record<string, unknown>) => row['email'] as string);
  }

  static async createCreateStoreInvitation(email: string): Promise<AdminInvitation> {
    const pool = getPool();
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO store_invitations (store_id, email, role, token, expires_at, created_at)
       VALUES (NULL, $1, 1, $2, NOW() + INTERVAL '1 day', NOW())
       RETURNING *`,
      [email, token],
    );
    // Need to re-query to get the joined store_name
    return this.mapInvitationRow({ ...result.rows[0], store_name: null });
  }

  static async revokeInvitation(invitationId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      'DELETE FROM store_invitations WHERE id = $1',
      [invitationId],
    );
  }

  static async getAuditLog(
    page: number,
    limit: number,
    filters: { userId?: number; method?: string; statusCode?: string; dateFrom?: string; dateTo?: string; search?: string; since?: string; excludeIds?: string[] },
  ): Promise<PaginatedResult<AdminAuditEntry>> {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const filterParams: unknown[] = [];
    let idx = 1;

    if (filters.userId) {
      conditions.push(`al.user_id = $${idx++}`);
      filterParams.push(filters.userId);
    }
    if (filters.method) {
      conditions.push(`al.method = $${idx++}`);
      filterParams.push(filters.method.toUpperCase());
    }
    if (filters.statusCode) {
      conditions.push(`al.status_code = $${idx++}`);
      filterParams.push(parseInt(filters.statusCode, 10));
    }
    if (filters.dateFrom) {
      conditions.push(`al.created_at >= $${idx++}`);
      filterParams.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`al.created_at <= $${idx++}`);
      filterParams.push(filters.dateTo);
    }
    if (filters.since) {
      conditions.push(`al.created_at >= $${idx++}`);
      filterParams.push(filters.since);
    }
    if (filters.excludeIds?.length) {
      const placeholders = filters.excludeIds.map(() => `$${idx++}`).join(', ');
      conditions.push(`al.id NOT IN (${placeholders})`);
      filterParams.push(...filters.excludeIds);
    }
    if (filters.search) {
      const searchParam = `%${filters.search}%`;
      conditions.push(`(u.email ILIKE $${idx} OR al.method ILIKE $${idx} OR al.path ILIKE $${idx} OR al.ip ILIKE $${idx} OR al.status_code::text ILIKE $${idx})`);
      filterParams.push(searchParam);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM admin_audit_log al JOIN users u ON u.id = al.user_id ${whereClause}`,
      filterParams,
    );
    const total = parseInt(countResult.rows[0].count as string, 10);

    // Re-number conditions for the main query which prepends $1=limit, $2=offset
    const mainConditions = conditions.map((c) =>
      c.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n, 10) + 2}`),
    );
    const mainWhereClause = mainConditions.length > 0 ? `WHERE ${mainConditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT al.id, al.user_id, u.email AS user_email, al.store_id, al.method, al.path,
              al.status_code, al.ip,
              to_char(al.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at
       FROM admin_audit_log al
       JOIN users u ON u.id = al.user_id
       ${mainWhereClause}
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, ...filterParams],
    );

    return {
      items: result.rows.map(this.mapAuditEntryRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
      signupsPerDay: signupsRes.rows.map((row: Record<string, unknown>) => ({
        date: (row['date'] as Date).toISOString().split('T')[0]!,
        count: row['count'] as number,
      })),
    };
  }

  static async deleteUser(userId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM users_stores WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM store_invitations WHERE email = (SELECT email FROM users WHERE id = $1)', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  static async deleteStore(storeId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM users_stores WHERE store_id = $1', [storeId]);
    await pool.query('DELETE FROM store_invitations WHERE store_id = $1', [storeId]);
    await pool.query('DELETE FROM stores WHERE id = $1', [storeId]);
  }

  static async findUserById(userId: number): Promise<{ id: number; isAdmin: boolean } | null> {
    const pool = getPool();
    const result = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [userId]);
    if (!result.rows[0]) return null;
    return { id: Number(result.rows[0].id), isAdmin: result.rows[0].is_admin as boolean };
  }

  static async findInvitationById(id: number): Promise<{ usedAt: Date | null; revokedAt: Date | null; expiresAt: Date } | null> {
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
      id: Number(row['id']),
      email: row['email'] as string,
      name: row['name'] as string,
      isAdmin: row['is_admin'] as boolean,
      disabledAt: row['disabled_at'] ? new Date(row['disabled_at'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
      storeCount: (row['store_count'] as number) ?? 0,
    };
  }

  private static mapStoreRow(row: Record<string, unknown>): AdminStore {
    return {
      id: Number(row['id']),
      name: row['name'] as string,
      code: (row['code'] as string) ?? null,
      address: (row['address'] as string) ?? null,
      createdAt: new Date(row['created_at'] as string),
      memberCount: (row['member_count'] as number) ?? 0,
    };
  }

  private static mapStoreMemberRow(row: Record<string, unknown>): AdminStoreMember {
    return {
      userId: Number(row['user_id']),
      email: row['email'] as string,
      name: row['name'] as string,
      role: row['role'] as number,
      joinedAt: new Date(row['joined_at'] as string),
    };
  }

  private static mapInvitationRow(row: Record<string, unknown>): AdminInvitation {
    const usedAt = row['used_at'] ? new Date(row['used_at'] as string) : null;
    const revokedAt = row['revoked_at'] ? new Date(row['revoked_at'] as string) : null;
    const expiresAt = new Date(row['expires_at'] as string);

    let status: AdminInvitation['status'] = 'pending';
    if (usedAt) status = 'used';
    else if (revokedAt) status = 'revoked';
    else if (expiresAt <= new Date()) status = 'expired';

    return {
      id: Number(row['id']),
      email: row['email'] as string,
      storeId: row['store_id'] != null ? Number(row['store_id']) : null,
      storeName: (row['store_name'] as string) ?? null,
      role: row['role'] as number,
      token: row['token'] as string,
      status,
      expiresAt,
      usedAt,
      revokedAt,
      createdAt: new Date(row['created_at'] as string),
    };
  }

  static async cleanupTestUsers(emailPattern: string): Promise<number> {
    const pool = getPool();

    // Delete stores owned exclusively by test users
    await pool.query(
      `DELETE FROM stores WHERE id IN (
        SELECT us.store_id FROM users_stores us
        JOIN users u ON u.id = us.user_id
        WHERE u.email LIKE $1
        AND NOT EXISTS (
          SELECT 1 FROM users_stores us2
          JOIN users u2 ON u2.id = us2.user_id
          WHERE us2.store_id = us.store_id AND u2.email NOT LIKE $1
        )
      )`,
      [emailPattern],
    );

    // Delete test invitations
    await pool.query('DELETE FROM store_invitations WHERE email LIKE $1', [emailPattern]);

    // Delete test users (audit logs cascade via FK)
    const result = await pool.query('DELETE FROM users WHERE email LIKE $1', [emailPattern]);
    return result.rowCount ?? 0;
  }

  static async getAuditLogRequestBody(auditLogId: number): Promise<unknown | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT body FROM admin_audit_log_request_body WHERE audit_log_id = $1',
      [auditLogId],
    );
    return result.rows[0]?.body ?? null;
  }

  static async getAuditLogResponseBody(auditLogId: number): Promise<unknown | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT body FROM admin_audit_log_response_body WHERE audit_log_id = $1',
      [auditLogId],
    );
    return result.rows[0]?.body ?? null;
  }

  private static mapAuditEntryRow(row: Record<string, unknown>): AdminAuditEntry {
    return {
      id: Number(row['id']),
      userId: Number(row['user_id']),
      userEmail: row['user_email'] as string,
      storeId: row['store_id'] != null ? Number(row['store_id']) : null,
      method: row['method'] as string,
      path: row['path'] as string,
      statusCode: row['status_code'] as number,
      ip: row['ip'] as string,
      createdAt: row['created_at'] as string,
    };
  }
}
