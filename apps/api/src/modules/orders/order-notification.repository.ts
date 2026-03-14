import { getPool } from '../../core/database/postgres.js';

export interface OrderNotification {
  id: number;
  orderId: number;
  storeId: number;
  customerId: number | null;
  statusFrom: number | null;
  statusTo: number;
  message: string;
  read: boolean;
  createdAt: Date;
}

export class PgOrderNotificationRepository {
  static async create(data: {
    orderId: number;
    storeId: number;
    customerId: number | null;
    statusFrom: number | null;
    statusTo: number;
    message: string;
  }): Promise<OrderNotification> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO order_notifications (order_id, store_id, customer_id, status_from, status_to, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.orderId, data.storeId, data.customerId, data.statusFrom, data.statusTo, data.message],
    );
    return this.mapRow(result.rows[0]);
  }

  static async findByOrderId(orderId: number): Promise<OrderNotification[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM order_notifications WHERE order_id = $1 ORDER BY created_at ASC`,
      [orderId],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async countUnreadByOrderId(orderId: number): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM order_notifications WHERE order_id = $1 AND read = false`,
      [orderId],
    );
    return result.rows[0]?.count ?? 0;
  }

  static async markAllReadByOrderId(orderId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE order_notifications SET read = true WHERE order_id = $1 AND read = false`,
      [orderId],
    );
  }

  private static mapRow(row: Record<string, unknown>): OrderNotification {
    return {
      id: Number(row['id']),
      orderId: Number(row['order_id']),
      storeId: Number(row['store_id']),
      customerId: row['customer_id'] != null ? Number(row['customer_id']) : null,
      statusFrom: row['status_from'] != null ? Number(row['status_from']) : null,
      statusTo: Number(row['status_to']),
      message: row['message'] as string,
      read: row['read'] as boolean,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
