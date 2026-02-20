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

  app.get<{ Querystring: { category?: string; search?: string } }>('/', (req, reply) => controller.getAll(req, reply));
  app.get<{ Params: { id: string } }>('/:id', (req, reply) => controller.getById(req, reply));
  app.get<{ Params: { id: string } }>('/:id/cost', (req, reply) => controller.calculateCost(req, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put<{ Params: { id: string } }>('/:id', (req, reply) => controller.update(req, reply));
  app.delete<{ Params: { id: string } }>('/:id', (req, reply) => controller.delete(req, reply));
}
