import type { FastifyInstance } from 'fastify';
import { RecipeController } from './recipe.controller.js';
import { RecipeService } from './recipe.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

export default async function recipeRoutes(app: FastifyInstance) {
  const inventoryService = new InventoryService();
  const service = new RecipeService(inventoryService);
  const controller = new RecipeController(service);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get('/', (req, reply) => controller.getAll(req as any, reply));
  app.get('/:id', (req, reply) => controller.getById(req as any, reply));
  app.get('/:id/cost', (req, reply) => controller.calculateCost(req as any, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put('/:id', (req, reply) => controller.update(req as any, reply));
  app.delete('/:id', (req, reply) => controller.delete(req as any, reply));
}
