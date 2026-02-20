import type { LoyaltyConfig, LoyaltyTransaction, CustomerLoyaltySummary, CreateLoyaltyTransactionDTO, UpsertLoyaltyConfigDTO } from './loyalty.types.js';
import { getPool } from '../../core/database/postgres.js';

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export class PgLoyaltyRepository {
  static async getConfig(storeId: string): Promise<LoyaltyConfig | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM loyalty_config WHERE store_id = $1',
      [storeId],
    );
    return result.rows[0] ? this.mapConfigRow(result.rows[0]) : null;
  }

  static async upsertConfig(storeId: string, data: UpsertLoyaltyConfigDTO): Promise<LoyaltyConfig> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO loyalty_config (store_id, is_active, points_per_shekel, point_value, min_redeem_points)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (store_id) DO UPDATE SET
         is_active = COALESCE($2, loyalty_config.is_active),
         points_per_shekel = COALESCE($3, loyalty_config.points_per_shekel),
         point_value = COALESCE($4, loyalty_config.point_value),
         min_redeem_points = COALESCE($5, loyalty_config.min_redeem_points),
         updated_at = NOW()
       RETURNING *`,
      [
        storeId,
        data.isActive ?? false,
        data.pointsPerShekel ?? 1.0,
        data.pointValue ?? 0.1,
        data.minRedeemPoints ?? 0,
      ],
    );
    return this.mapConfigRow(result.rows[0]);
  }

  static async getCustomerBalance(storeId: string, customerId: string): Promise<CustomerLoyaltySummary> {
    const pool = getPool();
    const balanceResult = await pool.query(
      'SELECT loyalty_points FROM customers WHERE id = $1 AND store_id = $2',
      [customerId, storeId],
    );
    const balance = balanceResult.rows[0] ? Number(balanceResult.rows[0]['loyalty_points']) : 0;

    const aggResult = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) as lifetime_earned,
        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN ABS(points) ELSE 0 END), 0) as lifetime_redeemed
       FROM loyalty_transactions
       WHERE customer_id = $1 AND store_id = $2`,
      [customerId, storeId],
    );

    return {
      balance,
      lifetimeEarned: Number(aggResult.rows[0]['lifetime_earned']),
      lifetimeRedeemed: Number(aggResult.rows[0]['lifetime_redeemed']),
    };
  }

  static async createTransaction(storeId: string, data: CreateLoyaltyTransactionDTO & { balanceAfter: number }): Promise<LoyaltyTransaction> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO loyalty_transactions (store_id, customer_id, payment_id, type, points, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [storeId, data.customerId, data.paymentId ?? null, data.type, data.points, data.balanceAfter, data.description ?? null],
    );
    return this.mapTransactionRow(result.rows[0]);
  }

  static async updateCustomerBalance(storeId: string, customerId: string, delta: number): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE customers SET loyalty_points = loyalty_points + $3 WHERE id = $1 AND store_id = $2 RETURNING loyalty_points',
      [customerId, storeId, delta],
    );
    return Number(result.rows[0]['loyalty_points']);
  }

  static async findTransactionsByCustomer(
    storeId: string,
    customerId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<LoyaltyTransaction>> {
    const pool = getPool();
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM loyalty_transactions WHERE customer_id = $1 AND store_id = $2',
      [customerId, storeId],
    );
    const total = Number(countResult.rows[0].count);

    let query = `SELECT * FROM loyalty_transactions
       WHERE customer_id = $1 AND store_id = $2
       ORDER BY created_at DESC`;
    const params: unknown[] = [customerId, storeId];
    if (options) {
      query += ' LIMIT $3 OFFSET $4';
      params.push(options.limit, options.offset);
    }
    const result = await pool.query(query, params);
    return { items: result.rows.map((r: Record<string, unknown>) => this.mapTransactionRow(r)), total };
  }

  static async findTransactionByPaymentId(storeId: string, paymentId: string, type: string): Promise<LoyaltyTransaction | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM loyalty_transactions WHERE payment_id = $1 AND store_id = $2 AND type = $3 LIMIT 1',
      [paymentId, storeId, type],
    );
    return result.rows[0] ? this.mapTransactionRow(result.rows[0]) : null;
  }

  private static mapConfigRow(row: Record<string, unknown>): LoyaltyConfig {
    return {
      id: row['id'] as string,
      storeId: row['store_id'] as string,
      isActive: row['is_active'] as boolean,
      pointsPerShekel: Number(row['points_per_shekel']),
      pointValue: Number(row['point_value']),
      minRedeemPoints: Number(row['min_redeem_points']),
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  private static mapTransactionRow(row: Record<string, unknown>): LoyaltyTransaction {
    return {
      id: row['id'] as string,
      storeId: row['store_id'] as string,
      customerId: row['customer_id'] as string,
      paymentId: (row['payment_id'] as string) || null,
      type: row['type'] as LoyaltyTransaction['type'],
      points: Number(row['points']),
      balanceAfter: Number(row['balance_after']),
      description: (row['description'] as string) || null,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
