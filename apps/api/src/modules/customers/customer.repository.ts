import type { Customer, CreateCustomerDTO, UpdateCustomerDTO } from './customer.types.js';
import type { CustomerSegment, LoyaltyConfig } from '../loyalty/loyalty.types.js';
import { PgLoyaltyRepository } from '../loyalty/loyalty.repository.js';
import { getPool } from '../../core/database/postgres.js';

export class PgCustomerRepository {
  static async findById(id: number, storeId: number): Promise<Customer | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM customers WHERE id = $1 AND store_id = $2', [id, storeId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findAll(storeId: number, search?: string): Promise<Customer[]> {
    const pool = getPool();
    let query = `SELECT c.*, COUNT(o.id) AS order_count, COALESCE(SUM(o.total_amount), 0) AS total_spent
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.store_id = c.store_id
      WHERE c.store_id = $1`;
    const params: unknown[] = [storeId];
    if (search) {
      // Escape SQL LIKE special characters to prevent wildcard injection
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      query += ` AND (c.name ILIKE $2 ESCAPE '\\' OR c.email ILIKE $2 ESCAPE '\\' OR c.phone ILIKE $2 ESCAPE '\\')`;
      params.push(`%${escaped}%`);
    }
    query += ' GROUP BY c.id ORDER BY c.name ASC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async findByPhone(storeId: number, phone: string, excludeId?: number): Promise<Customer | null> {
    const pool = getPool();
    let query = 'SELECT * FROM customers WHERE store_id = $1 AND phone = $2';
    const params: unknown[] = [storeId, phone];
    if (excludeId) {
      query += ' AND id != $3';
      params.push(excludeId);
    }
    const result = await pool.query(query, params);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findByEmail(storeId: number, email: string, excludeId?: number): Promise<Customer | null> {
    const pool = getPool();
    let query = 'SELECT * FROM customers WHERE store_id = $1 AND email = $2';
    const params: unknown[] = [storeId, email];
    if (excludeId) {
      query += ' AND id != $3';
      params.push(excludeId);
    }
    const result = await pool.query(query, params);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findAllWithSegment(
    storeId: number,
    config: LoyaltyConfig,
    segment?: CustomerSegment,
    search?: string,
  ): Promise<Customer[]> {
    const pool = getPool();
    // Segment CTE params start at $1 (7 params: storeId + 6 thresholds)
    const cteParams = PgLoyaltyRepository.getSegmentCTEParams(storeId, config);
    let nextIdx = cteParams.length + 1; // $8

    let query = `WITH ${PgLoyaltyRepository.buildSegmentCTE(1)}
      SELECT cs.*, COUNT(o.id) AS order_count, COALESCE(SUM(o.total_amount), 0) AS total_spent
      FROM customer_segments cs
      LEFT JOIN orders o ON o.customer_id = cs.id AND o.store_id = cs.store_id
      WHERE 1=1`;
    const params: unknown[] = [...cteParams];

    if (segment) {
      query += ` AND cs.segment = $${nextIdx}`;
      params.push(segment);
      nextIdx++;
    }

    if (search) {
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      query += ` AND (cs.name ILIKE $${nextIdx} ESCAPE '\\' OR cs.email ILIKE $${nextIdx} ESCAPE '\\' OR cs.phone ILIKE $${nextIdx} ESCAPE '\\')`;
      params.push(`%${escaped}%`);
      nextIdx++;
    }

    query += ' GROUP BY cs.id, cs.name, cs.phone, cs.email, cs.address, cs.notes, cs.preferences, cs.birthday, cs.loyalty_enabled, cs.loyalty_tier, cs.loyalty_points, cs.store_id, cs.created_at, cs.updated_at, cs.segment ORDER BY cs.name ASC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async create(storeId: number, data: CreateCustomerDTO): Promise<Customer> {
    const pool = getPool();
    const prefs = data.preferences ? JSON.stringify(data.preferences) : null;
    const loyaltyEnabled = data.loyaltyEnabled ?? true;
    const loyaltyTier = data.loyaltyTier ?? 'bronze';
    const birthday = data.birthday ? `2000-${data.birthday.substring(5)}` : null;
    const result = await pool.query(
      `INSERT INTO customers (store_id, name, phone, email, address, notes, preferences, birthday, loyalty_enabled, loyalty_tier, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [storeId, data.name, data.phone ?? null, data.email ?? null, data.address ?? null, data.notes ?? null, prefs, birthday, loyaltyEnabled, loyaltyTier],
    );
    return this.mapRow(result.rows[0]);
  }

  static async update(id: number, storeId: number, data: UpdateCustomerDTO): Promise<Customer> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
    if (data.address !== undefined) { fields.push(`address = $${idx++}`); values.push(data.address); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (data.preferences !== undefined) { fields.push(`preferences = $${idx++}`); values.push(JSON.stringify(data.preferences)); }
    if (data.birthday !== undefined) {
      fields.push(`birthday = $${idx++}`);
      values.push(data.birthday ? `2000-${data.birthday.substring(5)}` : null);
    }
    if (data.loyaltyEnabled !== undefined) { fields.push(`loyalty_enabled = $${idx++}`); values.push(data.loyaltyEnabled); }
    if (data.loyaltyTier !== undefined) { fields.push(`loyalty_tier = $${idx++}`); values.push(data.loyaltyTier); }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    const idIdx = idx++;
    values.push(storeId);

    const result = await pool.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${idIdx} AND store_id = $${idx} RETURNING *`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  static async delete(id: number, storeId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM customers WHERE id = $1 AND store_id = $2', [id, storeId]);
  }

  private static mapRow(row: Record<string, unknown>): Customer {
    const prefs = row['preferences'];
    let preferences = undefined;
    if (prefs && typeof prefs === 'string') {
      preferences = JSON.parse(prefs);
    } else if (prefs && typeof prefs === 'object') {
      preferences = prefs as Customer['preferences'];
    }

    const birthdayVal = row['birthday'];
    const birthday = birthdayVal ? (birthdayVal instanceof Date ? birthdayVal.toISOString().substring(0, 10) : String(birthdayVal).substring(0, 10)) : null;

    return {
      id: Number(row['id']),
      name: row['name'] as string,
      phone: row['phone'] as string,
      email: row['email'] as string | undefined,
      address: row['address'] as string | undefined,
      notes: row['notes'] as string | undefined,
      preferences,
      birthday,
      loyaltyEnabled: row['loyalty_enabled'] !== false,
      loyaltyTier: (row['loyalty_tier'] as string as Customer['loyaltyTier']) ?? 'bronze',
      ...(row['order_count'] !== undefined && { orderCount: Number(row['order_count']) }),
      ...(row['total_spent'] !== undefined && { totalSpent: Number(row['total_spent']) }),
      ...(row['segment'] !== undefined && { segment: row['segment'] as string }),
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
