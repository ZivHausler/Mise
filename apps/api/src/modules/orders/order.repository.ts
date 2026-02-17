import type { Order, CreateOrderDTO, OrderStatus, OrderItem } from './order.types.js';
import { ORDER_STATUS } from './order.types.js';
import { getPool } from '../../core/database/postgres.js';

export interface CustomerOrderFilters {
  status?: number;
  dateFrom?: string;
  dateTo?: string;
}

export class PgOrderRepository {
  static async findById(storeId: string, id: string): Promise<Order | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = $1 AND o.store_id = $2`,
      [id, storeId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findByCustomerId(storeId: string, customerId: string, options?: { limit: number; offset: number }, filters?: CustomerOrderFilters): Promise<{ orders: Order[]; total: number }> {
    const pool = getPool();
    let whereClause = 'WHERE customer_id = $1 AND store_id = $2';
    const baseParams: unknown[] = [customerId, storeId];
    let idx = 3;

    if (filters?.status !== undefined) {
      whereClause += ` AND status = $${idx++}`;
      baseParams.push(filters.status);
    }
    if (filters?.dateFrom) {
      whereClause += ` AND created_at >= $${idx++}`;
      baseParams.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      whereClause += ` AND created_at < ($${idx++}::date + interval '1 day')`;
      baseParams.push(filters.dateTo);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders ${whereClause}`,
      baseParams,
    );
    const total = Number(countResult.rows[0].count);

    let query = `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC`;
    const params = [...baseParams];
    if (options) {
      query += ` LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(options.limit, options.offset);
    }
    const result = await pool.query(query, params);
    return { orders: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

  static async findAll(storeId: string, filters?: { status?: OrderStatus }): Promise<Order[]> {
    const pool = getPool();
    let query = 'SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.store_id = $1';
    const params: unknown[] = [storeId];
    if (filters?.status !== undefined) {
      query += ' AND o.status = $2';
      params.push(filters.status);
    }
    query += ' ORDER BY o.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async create(storeId: string, data: CreateOrderDTO & { totalAmount: number }): Promise<Order> {
    const pool = getPool();
    const items = JSON.stringify(data.items);
    const result = await pool.query(
      `WITH new_order AS (
        INSERT INTO orders (id, store_id, customer_id, items, status, total_amount, notes, due_date, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      )
      SELECT o.*, c.name as customer_name FROM new_order o LEFT JOIN customers c ON o.customer_id = c.id`,
      [storeId, data.customerId, items, ORDER_STATUS.RECEIVED, data.totalAmount, data.notes ?? null, data.dueDate ?? null],
    );
    return this.mapRow(result.rows[0]);
  }

  static async update(storeId: string, id: string, data: Partial<Order>): Promise<Order> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (data.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(data.dueDate); }
    if (data.items !== undefined) { fields.push(`items = $${idx++}`); values.push(JSON.stringify(data.items)); }
    if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }

    fields.push(`updated_at = NOW()`);
    values.push(id, storeId);

    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1} RETURNING *`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  static async updateStatus(storeId: string, id: string, status: OrderStatus): Promise<Order> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3 RETURNING *`,
      [status, id, storeId],
    );
    return this.mapRow(result.rows[0]);
  }

  static async delete(storeId: string, id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM orders WHERE id = $1 AND store_id = $2', [id, storeId]);
  }

  private static mapRow(row: Record<string, unknown>): Order {
    let items: OrderItem[] = [];
    const rawItems = row['items'];
    if (typeof rawItems === 'string') {
      items = JSON.parse(rawItems);
    } else if (Array.isArray(rawItems)) {
      items = rawItems as OrderItem[];
    }

    return {
      id: row['id'] as string,
      orderNumber: Number(row['order_number']),
      customerId: row['customer_id'] as string,
      customerName: (row['customer_name'] as string) || undefined,
      items,
      status: Number(row['status']) as OrderStatus,
      totalAmount: Number(row['total_amount']),
      notes: row['notes'] as string | undefined,
      dueDate: row['due_date'] ? new Date(row['due_date'] as string) : undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
