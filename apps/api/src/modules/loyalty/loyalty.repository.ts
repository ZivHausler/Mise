import type {
  LoyaltyConfig,
  LoyaltyTransaction,
  CustomerLoyaltySummary,
  CreateLoyaltyTransactionDTO,
  UpsertLoyaltyConfigDTO,
  SegmentCounts,
  UpcomingBirthday,
  DormantCustomer,
  LoyaltyDashboardData,
} from './loyalty.types.js';
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
  static async getConfig(storeId: number): Promise<LoyaltyConfig | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM loyalty_config WHERE store_id = $1',
      [storeId],
    );
    return result.rows[0] ? this.mapConfigRow(result.rows[0]) : null;
  }

  static async upsertConfig(storeId: number, data: UpsertLoyaltyConfigDTO): Promise<LoyaltyConfig> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO loyalty_config (
         store_id, is_active, points_per_shekel, point_value, min_redeem_points,
         segment_vip_order_count, segment_vip_days, segment_regular_order_count,
         segment_regular_days, segment_new_days, segment_dormant_days, birthday_reminder_days
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (store_id) DO UPDATE SET
         is_active = COALESCE($2, loyalty_config.is_active),
         points_per_shekel = COALESCE($3, loyalty_config.points_per_shekel),
         point_value = COALESCE($4, loyalty_config.point_value),
         min_redeem_points = COALESCE($5, loyalty_config.min_redeem_points),
         segment_vip_order_count = COALESCE($6, loyalty_config.segment_vip_order_count),
         segment_vip_days = COALESCE($7, loyalty_config.segment_vip_days),
         segment_regular_order_count = COALESCE($8, loyalty_config.segment_regular_order_count),
         segment_regular_days = COALESCE($9, loyalty_config.segment_regular_days),
         segment_new_days = COALESCE($10, loyalty_config.segment_new_days),
         segment_dormant_days = COALESCE($11, loyalty_config.segment_dormant_days),
         birthday_reminder_days = COALESCE($12, loyalty_config.birthday_reminder_days),
         updated_at = NOW()
       RETURNING *`,
      [
        storeId,
        data.isActive ?? false,
        data.pointsPerShekel ?? 1.0,
        data.pointValue ?? 0.1,
        data.minRedeemPoints ?? 0,
        data.segmentVipOrderCount ?? 10,
        data.segmentVipDays ?? 90,
        data.segmentRegularOrderCount ?? 3,
        data.segmentRegularDays ?? 90,
        data.segmentNewDays ?? 30,
        data.segmentDormantDays ?? 60,
        data.birthdayReminderDays ?? 7,
      ],
    );
    return this.mapConfigRow(result.rows[0]);
  }

  static async getCustomerBalance(storeId: number, customerId: number): Promise<CustomerLoyaltySummary> {
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

  static async createTransaction(storeId: number, data: CreateLoyaltyTransactionDTO & { balanceAfter: number }): Promise<LoyaltyTransaction> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO loyalty_transactions (store_id, customer_id, payment_id, type, points, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [storeId, data.customerId, data.paymentId ?? null, data.type, data.points, data.balanceAfter, data.description ?? null],
    );
    return this.mapTransactionRow(result.rows[0]);
  }

  static async updateCustomerBalance(storeId: number, customerId: number, delta: number): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE customers SET loyalty_points = loyalty_points + $3 WHERE id = $1 AND store_id = $2 RETURNING loyalty_points',
      [customerId, storeId, delta],
    );
    return Number(result.rows[0]['loyalty_points']);
  }

  static async findTransactionsByCustomer(
    storeId: number,
    customerId: number,
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

  static async findTransactionByPaymentId(storeId: number, paymentId: number, type: string): Promise<LoyaltyTransaction | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM loyalty_transactions WHERE payment_id = $1 AND store_id = $2 AND type = $3 LIMIT 1',
      [paymentId, storeId, type],
    );
    return result.rows[0] ? this.mapTransactionRow(result.rows[0]) : null;
  }

  /**
   * Reusable segmentation CTE.
   * Config thresholds are passed as parameters to keep the SQL parameterized.
   * Returns: customer rows with a `segment` column.
   *
   * Parameter positions starting at $startIdx:
   *   $startIdx   = store_id
   *   $startIdx+1 = vip_order_count
   *   $startIdx+2 = vip_days
   *   $startIdx+3 = regular_order_count
   *   $startIdx+4 = regular_days
   *   $startIdx+5 = new_days
   *   $startIdx+6 = dormant_days
   */
  static buildSegmentCTE(startIdx: number): string {
    const s = startIdx;
    return `
      order_counts AS (
        SELECT customer_id, COUNT(*) AS recent_vip_orders
        FROM orders
        WHERE store_id = $${s} AND created_at >= NOW() - make_interval(days => $${s + 2}::int)
        GROUP BY customer_id
      ),
      order_counts_regular AS (
        SELECT customer_id, COUNT(*) AS recent_regular_orders
        FROM orders
        WHERE store_id = $${s} AND created_at >= NOW() - make_interval(days => $${s + 4}::int)
        GROUP BY customer_id
      ),
      order_counts_dormant AS (
        SELECT customer_id, COUNT(*) AS recent_dormant_orders
        FROM orders
        WHERE store_id = $${s} AND created_at >= NOW() - make_interval(days => $${s + 6}::int)
        GROUP BY customer_id
      ),
      total_order_counts AS (
        SELECT customer_id, COUNT(*) AS total_orders
        FROM orders
        WHERE store_id = $${s}
        GROUP BY customer_id
      ),
      customer_segments AS (
        SELECT
          c.*,
          CASE
            WHEN COALESCE(ov.recent_vip_orders, 0) >= $${s + 1}::int THEN 'vip'
            WHEN COALESCE(oreg.recent_regular_orders, 0) >= $${s + 3}::int THEN 'regular'
            WHEN c.created_at >= NOW() - make_interval(days => $${s + 5}::int)
              AND COALESCE(oreg.recent_regular_orders, 0) < $${s + 3}::int THEN 'new'
            WHEN COALESCE(toc.total_orders, 0) >= 1
              AND COALESCE(od.recent_dormant_orders, 0) = 0 THEN 'dormant'
            ELSE 'inactive'
          END AS segment
        FROM customers c
        LEFT JOIN order_counts ov ON ov.customer_id = c.id
        LEFT JOIN order_counts_regular oreg ON oreg.customer_id = c.id
        LEFT JOIN order_counts_dormant od ON od.customer_id = c.id
        LEFT JOIN total_order_counts toc ON toc.customer_id = c.id
        WHERE c.store_id = $${s}
      )`;
  }

  static getSegmentCTEParams(
    storeId: number,
    config: {
      segmentVipOrderCount: number;
      segmentVipDays: number;
      segmentRegularOrderCount: number;
      segmentRegularDays: number;
      segmentNewDays: number;
      segmentDormantDays: number;
    },
  ): unknown[] {
    return [
      storeId,
      config.segmentVipOrderCount,
      config.segmentVipDays,
      config.segmentRegularOrderCount,
      config.segmentRegularDays,
      config.segmentNewDays,
      config.segmentDormantDays,
    ];
  }

  static async getSegmentCounts(storeId: number, config: LoyaltyConfig): Promise<SegmentCounts> {
    const pool = getPool();
    const params = this.getSegmentCTEParams(storeId, config);
    const result = await pool.query(
      `WITH ${this.buildSegmentCTE(1)}
       SELECT segment, COUNT(*)::int AS count
       FROM customer_segments
       GROUP BY segment`,
      params,
    );
    const counts: SegmentCounts = { vip: 0, regular: 0, new: 0, dormant: 0, inactive: 0 };
    for (const row of result.rows) {
      const seg = row['segment'] as keyof SegmentCounts;
      if (seg in counts) counts[seg] = Number(row['count']);
    }
    return counts;
  }

  static async getUpcomingBirthdays(storeId: number, reminderDays: number): Promise<UpcomingBirthday[]> {
    const pool = getPool();
    // Use modular arithmetic to handle year boundary (e.g., Dec 28 showing Jan 2 birthday).
    // Wrap in subquery so we can filter by the computed days_until column.
    // Year 2000 is used because all birthdays are stored with year=2000 (leap year safe).
    const result = await pool.query(
      `SELECT * FROM (
         SELECT id, name, phone, birthday,
           CASE
             WHEN (
               EXTRACT(DOY FROM
                 MAKE_DATE(2000, EXTRACT(MONTH FROM birthday)::int, EXTRACT(DAY FROM birthday)::int)
               ) - EXTRACT(DOY FROM
                 MAKE_DATE(2000, EXTRACT(MONTH FROM NOW())::int, EXTRACT(DAY FROM NOW())::int)
               ) + 366
             ) % 366 = 0 THEN 0
             ELSE (
               (EXTRACT(DOY FROM
                 MAKE_DATE(2000, EXTRACT(MONTH FROM birthday)::int, EXTRACT(DAY FROM birthday)::int)
               ) - EXTRACT(DOY FROM
                 MAKE_DATE(2000, EXTRACT(MONTH FROM NOW())::int, EXTRACT(DAY FROM NOW())::int)
               ) + 366) % 366
             )::int
           END AS days_until
         FROM customers
         WHERE store_id = $1 AND birthday IS NOT NULL
       ) sub
       WHERE days_until <= $2
       ORDER BY days_until ASC`,
      [storeId, reminderDays],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: Number(row['id']),
      name: row['name'] as string,
      phone: row['phone'] as string,
      birthday: (row['birthday'] as string)?.substring(0, 10) ?? '',
      daysUntil: Number(row['days_until']),
    }));
  }

  static async getDormantCustomers(storeId: number, dormantDays: number): Promise<DormantCustomer[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT c.id, c.name, c.phone,
         MAX(o.created_at) AS last_order_date,
         (CURRENT_DATE - MAX(o.created_at)::date)::int AS days_since_last_order,
         COUNT(o.id)::int AS total_orders
       FROM customers c
       INNER JOIN orders o ON o.customer_id = c.id AND o.store_id = c.store_id
       WHERE c.store_id = $1
       GROUP BY c.id, c.name, c.phone
       HAVING MAX(o.created_at) < NOW() - make_interval(days => $2::int)
       ORDER BY days_since_last_order DESC
       LIMIT 50`,
      [storeId, dormantDays],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: Number(row['id']),
      name: row['name'] as string,
      phone: row['phone'] as string,
      lastOrderDate: row['last_order_date'] ? new Date(row['last_order_date'] as string).toISOString().substring(0, 10) : '',
      daysSinceLastOrder: Number(row['days_since_last_order']),
      totalOrders: Number(row['total_orders']),
    }));
  }

  private static mapConfigRow(row: Record<string, unknown>): LoyaltyConfig {
    return {
      id: Number(row['id']),
      storeId: Number(row['store_id']),
      isActive: row['is_active'] as boolean,
      pointsPerShekel: Number(row['points_per_shekel']),
      pointValue: Number(row['point_value']),
      minRedeemPoints: Number(row['min_redeem_points']),
      segmentVipOrderCount: Number(row['segment_vip_order_count'] ?? 10),
      segmentVipDays: Number(row['segment_vip_days'] ?? 90),
      segmentRegularOrderCount: Number(row['segment_regular_order_count'] ?? 3),
      segmentRegularDays: Number(row['segment_regular_days'] ?? 90),
      segmentNewDays: Number(row['segment_new_days'] ?? 30),
      segmentDormantDays: Number(row['segment_dormant_days'] ?? 60),
      birthdayReminderDays: Number(row['birthday_reminder_days'] ?? 7),
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  private static mapTransactionRow(row: Record<string, unknown>): LoyaltyTransaction {
    return {
      id: Number(row['id']),
      storeId: Number(row['store_id']),
      customerId: Number(row['customer_id']),
      paymentId: row['payment_id'] != null ? Number(row['payment_id']) : null,
      type: row['type'] as LoyaltyTransaction['type'],
      points: Number(row['points']),
      balanceAfter: Number(row['balance_after']),
      description: (row['description'] as string) || null,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
