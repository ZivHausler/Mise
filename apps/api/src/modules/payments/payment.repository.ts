import type { Payment, CreatePaymentDTO } from './payment.types.js';
import { getPool } from '../../core/database/postgres.js';

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface CustomerPaymentFilters {
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class PgPaymentRepository {
  static async findAll(storeId: string, options?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    const pool = getPool();
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments p
       JOIN orders o2 ON p.order_id = o2.id
       WHERE o2.store_id = $1`,
      [storeId],
    );
    const total = Number(countResult.rows[0].count);

    let query = `SELECT p.*, o.order_number, c.name as customer_name
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       JOIN orders o2 ON p.order_id = o2.id
       WHERE o2.store_id = $1
       ORDER BY p.created_at DESC`;
    const params: unknown[] = [storeId];
    if (options) {
      query += ' LIMIT $2 OFFSET $3';
      params.push(options.limit, options.offset);
    }
    const result = await pool.query(query, params);
    return { items: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

  static async findByCustomerId(storeId: string, customerId: string, options?: PaginationOptions, filters?: CustomerPaymentFilters): Promise<PaginatedResult<Payment>> {
    const pool = getPool();
    let whereClause = 'WHERE o.customer_id = $1 AND o.store_id = $2';
    const baseParams: unknown[] = [customerId, storeId];
    let idx = 3;

    if (filters?.method) {
      whereClause += ` AND p.method = $${idx++}`;
      baseParams.push(filters.method);
    }
    if (filters?.dateFrom) {
      whereClause += ` AND p.created_at >= $${idx++}`;
      baseParams.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      whereClause += ` AND p.created_at < ($${idx++}::date + interval '1 day')`;
      baseParams.push(filters.dateTo);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments p
       JOIN orders o ON p.order_id = o.id
       ${whereClause}`,
      baseParams,
    );
    const total = Number(countResult.rows[0].count);

    let query = `SELECT p.*, o.order_number, c.name as customer_name
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       ${whereClause}
       ORDER BY p.created_at DESC`;
    const params = [...baseParams];
    if (options) {
      query += ` LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(options.limit, options.offset);
    }
    const result = await pool.query(query, params);
    return { items: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

  static async findById(storeId: string, id: string): Promise<Payment | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT p.* FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.id = $1 AND o.store_id = $2`,
      [id, storeId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findByOrderId(storeId: string, orderId: string): Promise<Payment[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT p.* FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.order_id = $1 AND o.store_id = $2
       ORDER BY p.created_at DESC`,
      [orderId, storeId],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async create(storeId: string, data: CreatePaymentDTO): Promise<Payment> {
    const pool = getPool();
    // Verify the order belongs to the store
    const orderCheck = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND store_id = $2',
      [data.orderId, storeId],
    );
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found in this store');
    }
    const result = await pool.query(
      `INSERT INTO payments (id, order_id, amount, method, notes, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [data.orderId, data.amount, data.method, data.notes ?? null],
    );
    return this.mapRow(result.rows[0]);
  }

  static async delete(storeId: string, id: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `DELETE FROM payments p
       USING orders o
       WHERE p.order_id = o.id AND p.id = $1 AND o.store_id = $2`,
      [id, storeId],
    );
  }

  private static mapRow(row: Record<string, unknown>): Payment {
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
