import type { Payment, CreatePaymentDTO } from './payment.types.js';

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface IPaymentRepository {
  findAll(options?: PaginationOptions): Promise<PaginatedResult<Payment>>;
  findByCustomerId(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Payment>>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
  create(data: CreatePaymentDTO): Promise<Payment>;
  delete(id: string): Promise<void>;
}

import { getPool } from '../../core/database/postgres.js';

export class PgPaymentRepository implements IPaymentRepository {
  async findAll(options?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    const pool = getPool();
    const countResult = await pool.query('SELECT COUNT(*) FROM payments');
    const total = Number(countResult.rows[0].count);

    let query = `SELECT p.*, o.order_number, c.name as customer_name
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY p.created_at DESC`;
    const params: unknown[] = [];
    if (options) {
      query += ' LIMIT $1 OFFSET $2';
      params.push(options.limit, options.offset);
    }
    const result = await pool.query(query, params);
    return { items: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

  async findByCustomerId(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    const pool = getPool();
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE o.customer_id = $1`,
      [customerId],
    );
    const total = Number(countResult.rows[0].count);

    let query = `SELECT p.*, o.order_number, c.name as customer_name
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.customer_id = $1
       ORDER BY p.created_at DESC`;
    const params: unknown[] = [customerId];
    if (options) {
      query += ` LIMIT $2 OFFSET $3`;
      params.push(options.limit, options.offset);
    }
    const result = await pool.query(query, params);
    return { items: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

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
      orderNumber: row['order_number'] ? Number(row['order_number']) : undefined,
      customerName: (row['customer_name'] as string) || undefined,
      amount: Number(row['amount']),
      method: row['method'] as Payment['method'],
      notes: row['notes'] as string | undefined,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
