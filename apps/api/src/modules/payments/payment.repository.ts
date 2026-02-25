import type { Payment, CreatePaymentDTO } from './payment.types.js';
import { PAYMENT_RECORD_STATUS } from './payment.types.js';
import { getPool } from '../../core/database/postgres.js';
import { QueryBuilder } from '../../core/database/query-builder.js';

let ensuredStatusColumn = false;

async function ensureStatusColumn() {
  if (ensuredStatusColumn) return;
  const pool = getPool();
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'status'
      ) THEN
        ALTER TABLE payments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'completed';
      END IF;
    END $$;
  `);
  ensuredStatusColumn = true;
}

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

export interface PaymentFilters {
  status?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class PgPaymentRepository {
  static async findAll(storeId: number, options?: PaginationOptions, filters?: PaymentFilters): Promise<PaginatedResult<Payment>> {
    await ensureStatusColumn();
    const pool = getPool();
    const qb = new QueryBuilder(storeId);

    if (filters?.status) {
      qb.addCondition('p.status', '=', filters.status);
    }
    if (filters?.method) {
      qb.addCondition('p.method', '=', filters.method);
    }
    if (filters?.dateFrom) {
      qb.addCondition('p.created_at', '>=', filters.dateFrom);
    }
    if (filters?.dateTo) {
      const nextDay = new Date(filters.dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      qb.addCondition('p.created_at', '<', nextDay.toISOString().split('T')[0]);
    }

    const whereClause = `WHERE o2.store_id = $1${qb.getWhereClause()}`;
    const baseParams = qb.getParams();

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments p
       JOIN orders o2 ON p.order_id = o2.id
       ${whereClause}`,
      baseParams,
    );
    const total = Number(countResult.rows[0].count);

    let idx = qb.getNextParamIndex();
    let query = `SELECT p.*, o.order_number, c.name as customer_name
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       JOIN orders o2 ON p.order_id = o2.id
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

  static async findByCustomerId(storeId: number, customerId: number, options?: PaginationOptions, filters?: CustomerPaymentFilters): Promise<PaginatedResult<Payment>> {
    await ensureStatusColumn();
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

  static async findById(storeId: number, id: number): Promise<Payment | null> {
    await ensureStatusColumn();
    const pool = getPool();
    const result = await pool.query(
      `SELECT p.* FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.id = $1 AND o.store_id = $2`,
      [id, storeId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findByOrderId(storeId: number, orderId: number): Promise<Payment[]> {
    await ensureStatusColumn();
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

  static async create(storeId: number, data: CreatePaymentDTO): Promise<Payment> {
    await ensureStatusColumn();
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
      `INSERT INTO payments (order_id, amount, method, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [data.orderId, data.amount, data.method, data.notes ?? null, PAYMENT_RECORD_STATUS.COMPLETED],
    );
    return this.mapRow(result.rows[0]);
  }

  static async refund(storeId: number, id: number): Promise<Payment> {
    await ensureStatusColumn();
    const pool = getPool();
    const result = await pool.query(
      `UPDATE payments p
       SET status = $3
       FROM orders o
       WHERE p.order_id = o.id AND p.id = $1 AND o.store_id = $2
       RETURNING p.*`,
      [id, storeId, PAYMENT_RECORD_STATUS.REFUNDED],
    );
    if (result.rows.length === 0) {
      throw new Error('Payment not found');
    }
    return this.mapRow(result.rows[0]);
  }

  static async findPaidAmountsByStore(storeId: number): Promise<{ orderId: number; paidAmount: number }[]> {
    await ensureStatusColumn();
    const pool = getPool();
    const result = await pool.query(
      `SELECT p.order_id, SUM(p.amount) as paid_amount
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE o.store_id = $1 AND p.status = $2
       GROUP BY p.order_id`,
      [storeId, PAYMENT_RECORD_STATUS.COMPLETED],
    );
    return result.rows.map((r: Record<string, unknown>) => ({
      orderId: Number(r['order_id']),
      paidAmount: Number(r['paid_amount']),
    }));
  }

  static async delete(storeId: number, id: number): Promise<void> {
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
      id: Number(row['id']),
      orderId: Number(row['order_id']),
      orderNumber: row['order_number'] ? Number(row['order_number']) : undefined,
      customerName: (row['customer_name'] as string) || undefined,
      amount: Number(row['amount']),
      method: row['method'] as Payment['method'],
      status: (row['status'] as Payment['status']) || PAYMENT_RECORD_STATUS.COMPLETED,
      notes: row['notes'] as string | undefined,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
