import type { FastifyInstance } from 'fastify';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

export default async function analyticsRoutes(app: FastifyInstance) {
  const analyticsService = new AnalyticsService();
  const controller = new AnalyticsController(analyticsService);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get('/revenue', (req, reply) => controller.getRevenue(req, reply));
  app.get('/popular-recipes', (req, reply) => controller.getPopularRecipes(req, reply));
  app.get('/order-stats', (req, reply) => controller.getOrderStats(req, reply));
  app.get('/dashboard', (req, reply) => controller.getDashboard(req, reply));
  app.get('/customer-frequency', (req, reply) => controller.getCustomerFrequency(req, reply));
}
