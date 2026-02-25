import type { Order, CreateOrderDTO, OrderStatus, OrderItem } from './order.types.js';
import { ORDER_STATUS } from './order.types.js';
import { getPool } from '../../core/database/postgres.js';

export interface CustomerOrderFilters {
  status?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'created_at' | 'order_number';
  sortDir?: 'asc' | 'desc';
}

export class PgOrderRepository {
  static async findById(storeId: number, id: number): Promise<Order | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = $1 AND o.store_id = $2`,
      [id, storeId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findByCustomerId(storeId: number, customerId: number, options?: { limit: number; offset: number }, filters?: CustomerOrderFilters): Promise<{ orders: Order[]; total: number }> {
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

    const sortColumnMap: Record<string, string> = { created_at: 'created_at', order_number: 'order_number' };
    const sortColumn = sortColumnMap[filters?.sortBy ?? 'created_at'] ?? 'created_at';
    const sortDirection = filters?.sortDir === 'asc' ? 'ASC' : 'DESC';
    let query = `SELECT * FROM orders ${whereClause} ORDER BY ${sortColumn} ${sortDirection}`;
    const params = [...baseParams];
    if (options) {
      query += ` LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(options.limit, options.offset);
    }
    const result = await pool.query(query, params);
    return { orders: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

  static async findAll(storeId: number, filters?: { status?: OrderStatus; excludePaid?: boolean }): Promise<Order[]> {
    const pool = getPool();
    let query = 'SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.store_id = $1';
    const params: unknown[] = [storeId];
    let idx = 2;
    if (filters?.status !== undefined) {
      query += ` AND o.status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters?.excludePaid) {
      query += ` AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'completed')`;
    }
    query += ' ORDER BY o.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async findAllPaginated(storeId: number, options: { limit: number; offset: number }, filters?: { status?: OrderStatus; excludePaid?: boolean; dateFrom?: string; dateTo?: string; search?: string }): Promise<{ orders: Order[]; total: number }> {
    const pool = getPool();
    let whereClause = 'WHERE o.store_id = $1';
    const baseParams: unknown[] = [storeId];
    let idx = 2;
    if (filters?.status !== undefined) {
      whereClause += ` AND o.status = $${idx++}`;
      baseParams.push(filters.status);
    }
    if (filters?.excludePaid) {
      whereClause += ` AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'completed')`;
    }
    if (filters?.dateFrom) {
      whereClause += ` AND o.created_at >= $${idx++}`;
      baseParams.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      const nextDay = new Date(filters.dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ` AND o.created_at < $${idx++}`;
      baseParams.push(nextDay.toISOString().split('T')[0]);
    }
    if (filters?.search) {
      const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
      whereClause += ` AND (c.name ILIKE $${idx} ESCAPE '\\\\' OR o.order_number::text ILIKE $${idx} ESCAPE '\\\\')`;
      baseParams.push(`%${escaped}%`);
      idx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ${whereClause}`,
      baseParams,
    );
    const total = Number(countResult.rows[0].count);

    const params = [...baseParams];
    let query = `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ${whereClause} ORDER BY o.created_at DESC`;
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(options.limit, options.offset);
    const result = await pool.query(query, params);
    return { orders: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

  static async create(storeId: number, data: CreateOrderDTO & { totalAmount: number; recurringGroupId?: number }): Promise<Order> {
    const pool = getPool();
    const items = JSON.stringify(data.items);
    const result = await pool.query(
      `WITH new_order AS (
        INSERT INTO orders (store_id, customer_id, items, status, total_amount, notes, due_date, recurring_group_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      )
      SELECT o.*, c.name as customer_name FROM new_order o LEFT JOIN customers c ON o.customer_id = c.id`,
      [storeId, data.customerId, items, ORDER_STATUS.RECEIVED, data.totalAmount, data.notes ?? null, data.dueDate ?? null, data.recurringGroupId ?? null],
    );
    return this.mapRow(result.rows[0]);
  }

  static async update(storeId: number, id: number, data: Partial<Order>): Promise<Order> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (data.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(data.dueDate); }
    if (data.items !== undefined) {
      fields.push(`items = $${idx++}`); values.push(JSON.stringify(data.items));
      // totalAmount must always accompany items (computed by service layer)
      fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, storeId);

    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1} RETURNING *`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  static async updateStatus(storeId: number, id: number, status: OrderStatus): Promise<Order> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3 RETURNING *`,
      [status, id, storeId],
    );
    return this.mapRow(result.rows[0]);
  }

  static async delete(storeId: number, id: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM orders WHERE id = $1 AND store_id = $2', [id, storeId]);
  }

  static async findByDateRange(
    storeId: number,
    filters: { from: string; to: string; status?: number },
  ): Promise<Order[]> {
    const pool = getPool();
    let query = `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.store_id = $1 AND o.due_date IS NOT NULL AND o.due_date >= $2::date AND o.due_date < ($3::date + interval '1 day')`;
    const params: unknown[] = [storeId, filters.from, filters.to];
    let idx = 4;
    if (filters.status !== undefined) {
      query += ` AND o.status = $${idx++}`;
      params.push(filters.status);
    }
    query += ' ORDER BY o.due_date ASC, o.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async getCalendarAggregates(
    storeId: number,
    filters: { from: string; to: string },
  ): Promise<Array<{ day: string; total: number; received: number; inProgress: number; ready: number; delivered: number }>> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
        DATE(o.due_date) as day,
        COUNT(*)::int as total,
        COUNT(CASE WHEN o.status = 0 THEN 1 END)::int as received,
        COUNT(CASE WHEN o.status = 1 THEN 1 END)::int as in_progress,
        COUNT(CASE WHEN o.status = 2 THEN 1 END)::int as ready,
        COUNT(CASE WHEN o.status = 3 THEN 1 END)::int as delivered
      FROM orders o
      WHERE o.store_id = $1
        AND o.due_date IS NOT NULL
        AND o.due_date >= $2::date
        AND o.due_date < ($3::date + interval '1 day')
      GROUP BY DATE(o.due_date)
      ORDER BY DATE(o.due_date) ASC`,
      [storeId, filters.from, filters.to],
    );
    return result.rows.map((r: Record<string, unknown>) => ({
      day: (r['day'] as Date).toISOString().split('T')[0]!,
      total: Number(r['total']),
      received: Number(r['received']),
      inProgress: Number(r['in_progress']),
      ready: Number(r['ready']),
      delivered: Number(r['delivered']),
    }));
  }

  static async findByDay(
    storeId: number,
    filters: { date: string; status?: number; limit: number; offset: number },
  ): Promise<{ orders: Order[]; total: number }> {
    const pool = getPool();
    let whereClause = `WHERE o.store_id = $1 AND o.due_date IS NOT NULL AND DATE(o.due_date) = $2::date`;
    const baseParams: unknown[] = [storeId, filters.date];
    let idx = 3;

    if (filters.status !== undefined) {
      whereClause += ` AND o.status = $${idx++}`;
      baseParams.push(filters.status);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders o ${whereClause}`,
      baseParams,
    );
    const total = Number(countResult.rows[0].count);

    const params = [...baseParams];
    const query = `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ${whereClause} ORDER BY o.due_date ASC, o.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(filters.limit, filters.offset);
    const result = await pool.query(query, params);
    return { orders: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

  static async findFutureByRecurringGroup(storeId: number, recurringGroupId: number, afterDate: Date): Promise<Order[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.store_id = $1 AND o.recurring_group_id = $2 AND o.due_date > $3 AND o.status = $4
       ORDER BY o.due_date ASC`,
      [storeId, recurringGroupId, afterDate, ORDER_STATUS.RECEIVED],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async findByIdInternal(id: number): Promise<{ storeId: number; customerId: number } | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT store_id, customer_id FROM orders WHERE id = $1',
      [id],
    );
    if (!result.rows[0]) return null;
    return {
      storeId: Number(result.rows[0]['store_id']),
      customerId: Number(result.rows[0]['customer_id']),
    };
  }

  static async countActiveByCustomer(storeId: number, customerId: number): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM orders WHERE store_id = $1 AND customer_id = $2 AND status != 3`,
      [storeId, customerId],
    );
    return result.rows[0]?.count ?? 0;
  }

  static async countActiveByRecipe(storeId: number, recipeId: string): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM orders WHERE store_id = $1 AND status != 3 AND items::jsonb @> $2::jsonb`,
      [storeId, JSON.stringify([{ recipeId }])],
    );
    return result.rows[0]?.count ?? 0;
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
      id: Number(row['id']),
      orderNumber: Number(row['order_number']),
      customerId: Number(row['customer_id']),
      customerName: (row['customer_name'] as string) || undefined,
      items,
      status: Number(row['status']) as OrderStatus,
      totalAmount: Number(row['total_amount']),
      notes: row['notes'] as string | undefined,
      dueDate: row['due_date'] ? new Date(row['due_date'] as string) : undefined,
      recurringGroupId: row['recurring_group_id'] != null ? Number(row['recurring_group_id']) : undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
