import { getPool } from '../../core/database/postgres.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export interface StorefrontCustomer {
  id: number;
  googleId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  photo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class StorefrontAuthRepository {
  /**
   * Upsert a global customer by google_id.
   * On conflict (returning user), update photo/email and use COALESCE
   * for first_name/last_name to avoid overwriting manually-set values with NULL.
   */
  static async upsertCustomer(data: {
    googleId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    photo: string | null;
  }): Promise<StorefrontCustomer> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO customers (google_id, email, first_name, last_name, photo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (google_id) DO UPDATE SET
         email = EXCLUDED.email,
         first_name = COALESCE(customers.first_name, EXCLUDED.first_name),
         last_name = COALESCE(customers.last_name, EXCLUDED.last_name),
         photo = EXCLUDED.photo,
         updated_at = NOW()
       RETURNING *`,
      [data.googleId, data.email, data.firstName, data.lastName, data.photo],
    );
    return this.mapRow(result.rows[0]);
  }

  static async findById(id: number): Promise<StorefrontCustomer | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Update customer profile fields (firstName, lastName, phone).
   * Only updates fields that are provided (non-undefined).
   */
  static async updateProfile(
    customerId: number,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<StorefrontCustomer> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.firstName !== undefined) {
      setClauses.push(`first_name = $${paramIndex++}`);
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      setClauses.push(`last_name = $${paramIndex++}`);
      values.push(data.lastName);
    }
    if (data.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }

    setClauses.push('updated_at = NOW()');
    values.push(customerId);

    const pool = getPool();
    const result = await pool.query(
      `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    if (!result.rows[0]) {
      throw new NotFoundError('Customer not found');
    }
    return this.mapRow(result.rows[0]);
  }

  private static mapRow(row: Record<string, unknown>): StorefrontCustomer {
    return {
      id: Number(row['id']),
      googleId: row['google_id'] as string,
      email: row['email'] as string,
      firstName: (row['first_name'] as string) || null,
      lastName: (row['last_name'] as string) || null,
      phone: (row['phone'] as string) || null,
      photo: (row['photo'] as string) || null,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
