import type { Customer, CreateCustomerDTO, UpdateCustomerDTO } from './customer.types.js';
import { getPool } from '../../core/database/postgres.js';

export class PgCustomerRepository {
  static async findById(id: string, storeId: string): Promise<Customer | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM customers WHERE id = $1 AND store_id = $2', [id, storeId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findAll(storeId: string, search?: string): Promise<Customer[]> {
    const pool = getPool();
    let query = 'SELECT * FROM customers WHERE store_id = $1';
    const params: unknown[] = [storeId];
    if (search) {
      // Escape SQL LIKE special characters to prevent wildcard injection
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      query += ` AND (name ILIKE $2 ESCAPE '\\' OR email ILIKE $2 ESCAPE '\\' OR phone ILIKE $2 ESCAPE '\\')`;
      params.push(`%${escaped}%`);
    }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async findByPhone(storeId: string, phone: string, excludeId?: string): Promise<Customer | null> {
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

  static async findByEmail(storeId: string, email: string, excludeId?: string): Promise<Customer | null> {
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

  static async create(storeId: string, data: CreateCustomerDTO): Promise<Customer> {
    const pool = getPool();
    const prefs = data.preferences ? JSON.stringify(data.preferences) : null;
    const result = await pool.query(
      `INSERT INTO customers (id, store_id, name, phone, email, address, notes, preferences, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [storeId, data.name, data.phone ?? null, data.email ?? null, data.address ?? null, data.notes ?? null, prefs],
    );
    return this.mapRow(result.rows[0]);
  }

  static async update(id: string, storeId: string, data: UpdateCustomerDTO): Promise<Customer> {
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

  static async delete(id: string, storeId: string): Promise<void> {
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

    return {
      id: row['id'] as string,
      name: row['name'] as string,
      phone: row['phone'] as string,
      email: row['email'] as string | undefined,
      address: row['address'] as string | undefined,
      notes: row['notes'] as string | undefined,
      preferences,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
