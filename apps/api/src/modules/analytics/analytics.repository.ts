import { getPool } from '../../core/database/postgres.js';
import type { RevenueData, PopularRecipe, OrderStat, DashboardData, CustomerFrequency } from './analytics.types.js';

export class PgAnalyticsRepository {
  static async getRevenue(storeId: string): Promise<RevenueData> {
    const pool = getPool();

    const [dailyResult, totalResult] = await Promise.all([
      pool.query(
        `SELECT DATE(p.created_at) as date, SUM(p.amount) as total
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE o.store_id = $1 AND p.created_at >= NOW() - INTERVAL '30 days' AND p.status != 'refunded'
         GROUP BY DATE(p.created_at)
         ORDER BY date DESC`,
        [storeId],
      ),
      pool.query(
        `SELECT SUM(p.amount) as total
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE o.store_id = $1 AND p.status != 'refunded'`,
        [storeId],
      ),
    ]);

    return {
      daily: dailyResult.rows as unknown as RevenueData['daily'],
      totalRevenue: Number(totalResult.rows[0]?.['total'] ?? 0),
    };
  }

  static async getPopularRecipes(storeId: string): Promise<PopularRecipe[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         item->>'recipeId' as recipe_id,
         SUM((item->>'quantity')::int) as total_ordered
       FROM orders, jsonb_array_elements(items::jsonb) as item
       WHERE store_id = $1
       GROUP BY item->>'recipeId'
       ORDER BY total_ordered DESC
       LIMIT 10`,
      [storeId],
    );
    return result.rows as unknown as PopularRecipe[];
  }

  static async getOrderStats(storeId: string): Promise<OrderStat[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT status, COUNT(*) as count FROM orders WHERE store_id = $1 GROUP BY status`,
      [storeId],
    );
    return result.rows as unknown as OrderStat[];
  }

  static async getDashboard(storeId: string): Promise<DashboardData> {
    const pool = getPool();

    const [ordersToday, pendingOrders, lowStock, revenueToday] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count FROM orders WHERE store_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [storeId],
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM orders WHERE store_id = $1 AND status IN (0, 1, 2)`,
        [storeId],
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM ingredients WHERE store_id = $1 AND quantity <= low_stock_threshold`,
        [storeId],
      ),
      pool.query(
        `SELECT COALESCE(SUM(p.amount), 0) as total
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE o.store_id = $1 AND DATE(p.created_at) = CURRENT_DATE AND p.status != 'refunded'`,
        [storeId],
      ),
    ]);

    return {
      todayOrders: Number(ordersToday.rows[0]?.count ?? 0),
      pendingOrders: Number(pendingOrders.rows[0]?.count ?? 0),
      lowStockItems: Number(lowStock.rows[0]?.count ?? 0),
      todayRevenue: Number(revenueToday.rows[0]?.total ?? 0),
    };
  }

  static async getCustomerFrequency(storeId: string): Promise<CustomerFrequency[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT c.id, c.name, COUNT(o.id) as order_count
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
       WHERE c.store_id = $1
       GROUP BY c.id, c.name
       ORDER BY order_count DESC
       LIMIT 20`,
      [storeId],
    );
    return result.rows as unknown as CustomerFrequency[];
  }
}
