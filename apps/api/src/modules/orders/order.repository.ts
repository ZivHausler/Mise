import type { Order, CreateOrderDTO, OrderStatus, OrderItem } from './order.types.js';
import { ORDER_STATUS } from './order.types.js';

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  findAll(filters?: { status?: OrderStatus }): Promise<Order[]>;
  create(data: CreateOrderDTO & { totalAmount: number }): Promise<Order>;
  update(id: string, data: Partial<Order>): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
  delete(id: string): Promise<void>;
}

import { getPool } from '../../core/database/postgres.js';

export class PgOrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = $1`,
      [id],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async findAll(filters?: { status?: OrderStatus }): Promise<Order[]> {
    const pool = getPool();
    let query = 'SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id';
    const params: unknown[] = [];
    if (filters?.status !== undefined) {
      query += ' WHERE o.status = $1';
      params.push(filters.status);
    }
    query += ' ORDER BY o.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async create(data: CreateOrderDTO & { totalAmount: number }): Promise<Order> {
    const pool = getPool();
    const items = JSON.stringify(data.items);
    const result = await pool.query(
      `WITH new_order AS (
        INSERT INTO orders (id, customer_id, items, status, total_amount, notes, due_date, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      )
      SELECT o.*, c.name as customer_name FROM new_order o LEFT JOIN customers c ON o.customer_id = c.id`,
      [data.customerId, items, ORDER_STATUS.RECEIVED, data.totalAmount, data.notes ?? null, data.dueDate ?? null],
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (data.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(data.dueDate); }
    if (data.items !== undefined) { fields.push(`items = $${idx++}`); values.push(JSON.stringify(data.items)); }
    if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM orders WHERE id = $1', [id]);
  }

  private mapRow(row: Record<string, unknown>): Order {
    let items: OrderItem[] = [];
    const rawItems = row['items'];
    if (typeof rawItems === 'string') {
      items = JSON.parse(rawItems);
    } else if (Array.isArray(rawItems)) {
      items = rawItems as OrderItem[];
    }

    return {
      id: row['id'] as string,
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
