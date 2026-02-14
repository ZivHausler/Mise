import type { Payment, CreatePaymentDTO } from './payment.types.js';

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
  create(data: CreatePaymentDTO): Promise<Payment>;
  delete(id: string): Promise<void>;
}

import { getPool } from '../../core/database/postgres.js';

export class PgPaymentRepository implements IPaymentRepository {
  async findById(id: string): Promise<Payment | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC',
      [orderId],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async create(data: CreatePaymentDTO): Promise<Payment> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO payments (id, order_id, amount, method, notes, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [data.orderId, data.amount, data.method, data.notes ?? null],
    );
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM payments WHERE id = $1', [id]);
  }

  private mapRow(row: Record<string, unknown>): Payment {
    return {
      id: row['id'] as string,
      orderId: row['order_id'] as string,
      amount: Number(row['amount']),
      method: row['method'] as Payment['method'],
      notes: row['notes'] as string | undefined,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
