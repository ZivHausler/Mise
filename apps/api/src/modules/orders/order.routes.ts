import type { FastifyInstance } from 'fastify';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { RecipeService } from '../recipes/recipe.service.js';
import { InventoryService } from '../inventory/inventory.service.js';

export default async function orderRoutes(app: FastifyInstance) {
  const inventoryService = new InventoryService();
  const recipeService = new RecipeService(inventoryService);
  const orderService = new OrderService(recipeService, inventoryService);
  const controller = new OrderController(orderService);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get<{ Querystring: { status?: string; excludePaid?: string } }>('/', (req, reply) => controller.getAll(req, reply));
  app.get<{ Querystring: { from: string; to: string; status?: string } }>('/calendar/range', (req, reply) => controller.getCalendarRange(req, reply));
  app.get<{ Querystring: { from: string; to: string } }>('/calendar/aggregates', (req, reply) => controller.getCalendarAggregates(req, reply));
  app.get<{ Querystring: { date: string; status?: string; page?: string; limit?: string } }>('/calendar/day', (req, reply) => controller.getCalendarDay(req, reply));
  app.get<{ Params: { id: string } }>('/:id', (req, reply) => controller.getById(req, reply));
  app.get<{ Params: { id: string }; Querystring: { lang?: string; dateFormat?: string } }>('/:id/pdf', (req, reply) => controller.getPdf(req, reply));
  app.get<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string; status?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: string } }>('/customer/:customerId', (req, reply) => controller.getByCustomerId(req, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.post('/recurring', (req, reply) => controller.createRecurring(req, reply));
  app.patch<{ Params: { id: string } }>('/:id/status', (req, reply) => controller.updateStatus(req, reply));
  app.put<{ Params: { id: string } }>('/:id', (req, reply) => controller.update(req, reply));
  app.put<{ Params: { id: string } }>('/:id/recurring', (req, reply) => controller.updateRecurring(req, reply));
  app.delete<{ Params: { id: string } }>('/:id', (req, reply) => controller.delete(req, reply));
}
