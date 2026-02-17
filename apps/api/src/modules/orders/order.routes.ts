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

  app.get('/', (req, reply) => controller.getAll(req as any, reply));
  app.get('/:id', (req, reply) => controller.getById(req as any, reply));
  app.get('/customer/:customerId', (req, reply) => controller.getByCustomerId(req as any, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.patch('/:id/status', (req, reply) => controller.updateStatus(req as any, reply));
  app.put('/:id', (req, reply) => controller.update(req as any, reply));
  app.delete('/:id', (req, reply) => controller.delete(req as any, reply));
}
