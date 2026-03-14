import crypto from 'crypto';
import { getPool } from '../../core/database/postgres.js';
import { buildDynamicUpdate } from '../../core/db/query-builder.js';
import type { Store, UserStore, StoreInvitation, CreateStoreDTO, AppTheme } from './store.types.js';
import { StoreRole } from './store.types.js';

export class PgStoreRepository {
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'store';
  }

  static async createStore(data: CreateStoreDTO): Promise<Store> {
    const pool = getPool();
    // Use a temporary slug for the initial INSERT (slug is NOT NULL)
    const tempSlug = this.generateSlug(data.name);
    const result = await pool.query(
      `INSERT INTO stores (name, name_en, code, address, address_en, slug, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [data.name, data.nameEn ?? null, data.code ?? null, data.address ?? null, data.addressEn ?? null, tempSlug],
    );
    const store = this.mapStoreRow(result.rows[0]);

    // Update slug with store ID suffix to ensure uniqueness
    const finalSlug = `${tempSlug}-${store.id}`;
    await pool.query(
      'UPDATE stores SET slug = $1 WHERE id = $2',
      [finalSlug, store.id],
    );
    store.slug = finalSlug;

    // Initialize invoice counters for new store
    await pool.query(
      `INSERT INTO invoice_counters (store_id, counter_type, last_number)
       VALUES ($1, 'invoice', 0), ($1, 'credit_note', 0)
       ON CONFLICT DO NOTHING`,
      [store.id],
    );

    return store;
  }

  static async addUserToStore(userId: number, storeId: number, role: StoreRole): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users_stores (user_id, store_id, role, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, store_id) DO NOTHING`,
      [userId, storeId, role],
    );
  }

  static async findStoreById(storeId: number): Promise<Store | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM stores WHERE id = $1', [storeId]);
    return result.rows[0] ? this.mapStoreRow(result.rows[0]) : null;
  }

  static async getUserStores(userId: number): Promise<UserStore[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT us.user_id, us.store_id, us.role, s.name as store_name, s.code as store_code, s.theme
       FROM users_stores us
       JOIN stores s ON s.id = us.store_id
       WHERE us.user_id = $1
       ORDER BY us.created_at`,
      [userId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      userId: Number(row['user_id']),
      storeId: Number(row['store_id']),
      role: row['role'] as StoreRole,
      store: {
        id: Number(row['store_id']),
        name: row['store_name'] as string,
        code: (row['store_code'] as string) || null,
        theme: (row['theme'] as AppTheme) || 'cream',
      },
    }));
  }

  static async getAllStores(): Promise<Store[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM stores ORDER BY name');
    return result.rows.map((row: Record<string, unknown>) => this.mapStoreRow(row));
  }

  static async getStoreName(storeId: number): Promise<string | null> {
    const pool = getPool();
    const result = await pool.query('SELECT name FROM stores WHERE id = $1', [storeId]);
    return result.rows[0] ? (result.rows[0]['name'] as string) : null;
  }

  static async getUserStoreRole(userId: number, storeId: number): Promise<StoreRole | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT role FROM users_stores WHERE user_id = $1 AND store_id = $2`,
      [userId, storeId],
    );
    return result.rows[0] ? (result.rows[0]['role'] as StoreRole) : null;
  }

  static async getStoreMembers(storeId: number): Promise<{ userId: number; email: string; name: string; role: StoreRole }[]> {
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
      userId: Number(row['user_id']),
      email: row['email'] as string,
      name: row['name'] as string,
      role: row['role'] as StoreRole,
    }));
  }

  static async updateUserRole(userId: number, storeId: number, role: StoreRole): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE users_stores SET role = $1 WHERE user_id = $2 AND store_id = $3`,
      [role, userId, storeId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async removeUserFromStore(userId: number, storeId: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      `DELETE FROM users_stores WHERE user_id = $1 AND store_id = $2`,
      [userId, storeId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async createInvitation(storeId: number, email: string, role: StoreRole): Promise<StoreInvitation> {
    const pool = getPool();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day
    const result = await pool.query(
      `INSERT INTO store_invitations (store_id, email, role, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
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
       WHERE si.token = $1 AND si.used_at IS NULL AND si.revoked_at IS NULL AND si.expires_at > NOW()`,
      [token],
    );
    if (!result.rows[0]) return null;
    const inv = this.mapInvitationRow(result.rows[0]);
    return { ...inv, storeName: (result.rows[0]['store_name'] as string) || null };
  }

  static async createCreateStoreInvitation(email: string): Promise<StoreInvitation> {
    const pool = getPool();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day
    const result = await pool.query(
      `INSERT INTO store_invitations (store_id, email, role, token, expires_at, created_at)
       VALUES (NULL, $1, $2, $3, $4, NOW())
       RETURNING *`,
      [email, StoreRole.OWNER, token, expiresAt],
    );
    return this.mapInvitationRow(result.rows[0]);
  }

  static async getPendingInvitations(storeId: number): Promise<{ id: number; email: string; role: StoreRole; token: string; createdAt: Date; expiresAt: Date }[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, email, role, token, created_at, expires_at
       FROM store_invitations
       WHERE store_id = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [storeId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: Number(row['id']),
      email: row['email'] as string,
      role: row['role'] as StoreRole,
      token: row['token'] as string,
      createdAt: new Date(row['created_at'] as string),
      expiresAt: new Date(row['expires_at'] as string),
    }));
  }

  static async revokeInvitation(invitationId: number, storeId: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      `DELETE FROM store_invitations WHERE id = $1 AND store_id = $2`,
      [invitationId, storeId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async markInvitationUsed(token: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE store_invitations SET used_at = NOW() WHERE token = $1`,
      [token],
    );
  }

  static async updateTheme(storeId: number, data: { theme?: AppTheme; applyThemeToApp?: boolean }): Promise<void> {
    const pool = getPool();
    const result = buildDynamicUpdate(
      'stores',
      data,
      { theme: 'theme', applyThemeToApp: 'apply_theme_to_app' },
      'id = $1',
      [storeId],
    );
    if (!result) return;
    await pool.query(result.query, result.values);
  }

  static async updateBusinessInfo(storeId: number, data: { name?: string | null; nameEn?: string | null; address?: string | null; addressEn?: string | null; phone?: string | null; email?: string | null; taxNumber?: string | null; vatRate?: number; autoGenerateInvoice?: boolean; autoGenerateCreditNote?: boolean }): Promise<Store> {
    const pool = getPool();
    const built = buildDynamicUpdate(
      'stores',
      data,
      {
        name: 'name', nameEn: 'name_en', address: 'address', addressEn: 'address_en',
        phone: 'phone', email: 'email', taxNumber: 'tax_number', vatRate: 'vat_rate',
        autoGenerateInvoice: 'auto_generate_invoice', autoGenerateCreditNote: 'auto_generate_credit_note',
      },
      'id = $1',
      [storeId],
    );

    if (!built) {
      const existing = await this.findStoreById(storeId);
      return existing!;
    }

    const result = await pool.query(`${built.query} RETURNING *`, built.values);
    return this.mapStoreRow(result.rows[0]);
  }

  static async updateBranding(
    storeId: number,
    data: { logoUrl?: string | null; bannerUrl?: string | null; description?: string | null; descriptionEn?: string | null; categorySubject?: string | null; categorySubSubject?: string | null },
  ): Promise<Store> {
    const pool = getPool();
    const built = buildDynamicUpdate(
      'stores',
      data,
      {
        logoUrl: 'logo_url', bannerUrl: 'banner_url', description: 'description',
        descriptionEn: 'description_en', categorySubject: 'category_subject',
        categorySubSubject: 'category_sub_subject',
      },
      'id = $1',
      [storeId],
    );

    if (!built) {
      const existing = await this.findStoreById(storeId);
      return existing!;
    }

    const result = await pool.query(`${built.query} RETURNING *`, built.values);
    return this.mapStoreRow(result.rows[0]);
  }

  static async findBySlug(slug: string): Promise<Store | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM stores WHERE slug = $1', [slug]);
    return result.rows[0] ? this.mapStoreRow(result.rows[0]) : null;
  }

  static async updateSlug(storeId: number, slug: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE stores SET slug = $1, updated_at = NOW() WHERE id = $2',
      [slug, storeId],
    );
  }

  static async updateStorefrontEnabled(storeId: number, enabled: boolean): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE stores SET storefront_enabled = $1, updated_at = NOW() WHERE id = $2',
      [enabled, storeId],
    );
  }

  static async getOwnerUserId(storeId: number): Promise<number | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT user_id FROM users_stores WHERE store_id = $1 AND role = $2 LIMIT 1',
      [storeId, StoreRole.OWNER],
    );
    return result.rows[0] ? Number(result.rows[0]['user_id']) : null;
  }

  static async isSlugAvailable(slug: string, excludeStoreId?: number): Promise<boolean> {
    const pool = getPool();
    const result = excludeStoreId
      ? await pool.query('SELECT 1 FROM stores WHERE slug = $1 AND id != $2', [slug, excludeStoreId])
      : await pool.query('SELECT 1 FROM stores WHERE slug = $1', [slug]);
    return result.rows.length === 0;
  }

  private static mapStoreRow(row: Record<string, unknown>): Store {
    return {
      id: Number(row['id']),
      name: row['name'] as string,
      nameEn: (row['name_en'] as string) ?? null,
      code: (row['code'] as string) || null,
      address: (row['address'] as string) || null,
      addressEn: (row['address_en'] as string) ?? null,
      phone: (row['phone'] as string) || null,
      email: (row['email'] as string) || null,
      taxNumber: (row['tax_number'] as string) || null,
      vatRate: Number(row['vat_rate'] ?? 18),
      theme: (row['theme'] as AppTheme) || 'cream',
      logoUrl: (row['logo_url'] as string) ?? null,
      bannerUrl: (row['banner_url'] as string) ?? null,
      description: (row['description'] as string) ?? null,
      descriptionEn: (row['description_en'] as string) ?? null,
      slug: (row['slug'] as string) || '',
      categorySubject: (row['category_subject'] as string) ?? null,
      categorySubSubject: (row['category_sub_subject'] as string) ?? null,
      applyThemeToApp: row['apply_theme_to_app'] !== false,
      storefrontEnabled: Boolean(row['storefront_enabled']),
      autoGenerateInvoice: Boolean(row['auto_generate_invoice']),
      autoGenerateCreditNote: Boolean(row['auto_generate_credit_note']),
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  private static mapInvitationRow(row: Record<string, unknown>): StoreInvitation {
    return {
      id: Number(row['id']),
      storeId: row['store_id'] != null ? Number(row['store_id']) : null,
      email: row['email'] as string,
      role: row['role'] as StoreRole,
      token: row['token'] as string,
      expiresAt: new Date(row['expires_at'] as string),
      usedAt: row['used_at'] ? new Date(row['used_at'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
