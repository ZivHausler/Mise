import type { FastifyInstance } from 'fastify';
import { getPool } from '../../core/database/postgres.js';
import { authMiddleware } from '../../core/middleware/auth.js';

export default async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/revenue', async (_request, reply) => {
    const pool = getPool();

    const dailyResult = await pool.query(
      `SELECT DATE(created_at) as date, SUM(amount) as total
       FROM payments
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
    );

    const totalResult = await pool.query(
      `SELECT SUM(amount) as total FROM payments`,
    );

    return reply.send({
      success: true,
      data: {
        daily: dailyResult.rows,
        totalRevenue: Number(totalResult.rows[0]?.['total'] ?? 0),
      },
    });
  });

  app.get('/popular-recipes', async (_request, reply) => {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         item->>'recipeId' as recipe_id,
         SUM((item->>'quantity')::int) as total_ordered
       FROM orders, jsonb_array_elements(items::jsonb) as item
       GROUP BY item->>'recipeId'
       ORDER BY total_ordered DESC
       LIMIT 10`,
    );

    return reply.send({ success: true, data: result.rows });
  });

  app.get('/order-stats', async (_request, reply) => {
    const pool = getPool();
    const result = await pool.query(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`,
    );

    return reply.send({ success: true, data: result.rows });
  });

  app.get('/customer-frequency', async (_request, reply) => {
    const pool = getPool();
    const result = await pool.query(
      `SELECT c.id, c.name, COUNT(o.id) as order_count
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
       GROUP BY c.id, c.name
       ORDER BY order_count DESC
       LIMIT 20`,
    );

    return reply.send({ success: true, data: result.rows });
  });
}
