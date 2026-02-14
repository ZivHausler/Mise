import type { Customer, CreateCustomerDTO, UpdateCustomerDTO } from './customer.types.js';

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findAll(search?: string): Promise<Customer[]>;
  create(data: CreateCustomerDTO): Promise<Customer>;
  update(id: string, data: UpdateCustomerDTO): Promise<Customer>;
  delete(id: string): Promise<void>;
}

import { getPool } from '../../core/database/postgres.js';

export class PgCustomerRepository implements ICustomerRepository {
  async findById(id: string): Promise<Customer | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(search?: string): Promise<Customer[]> {
    const pool = getPool();
    let query = 'SELECT * FROM customers';
    const params: unknown[] = [];
    if (search) {
      // Escape SQL LIKE special characters to prevent wildcard injection
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      query += ` WHERE (name ILIKE $1 ESCAPE '\\' OR email ILIKE $1 ESCAPE '\\' OR phone ILIKE $1 ESCAPE '\\')`;
      params.push(`%${escaped}%`);
    }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async create(data: CreateCustomerDTO): Promise<Customer> {
    const pool = getPool();
    const prefs = data.preferences ? JSON.stringify(data.preferences) : null;
    const result = await pool.query(
      `INSERT INTO customers (id, name, phone, email, address, notes, preferences, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [data.name, data.phone ?? null, data.email ?? null, data.address ?? null, data.notes ?? null, prefs],
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: UpdateCustomerDTO): Promise<Customer> {
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

    const result = await pool.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
  }

  private mapRow(row: Record<string, unknown>): Customer {
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
      phone: row['phone'] as string | undefined,
      email: row['email'] as string | undefined,
      address: row['address'] as string | undefined,
      notes: row['notes'] as string | undefined,
      preferences,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
