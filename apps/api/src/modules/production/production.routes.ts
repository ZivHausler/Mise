import type { FastifyInstance } from 'fastify';
import { ProductionController } from './production.controller.js';
import { ProductionService } from './production.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { RecipeService } from '../recipes/recipe.service.js';
import { InventoryService } from '../inventory/inventory.service.js';

export default async function productionRoutes(app: FastifyInstance) {
  const inventoryService = new InventoryService();
  const recipeService = new RecipeService(inventoryService);
  const productionService = new ProductionService(recipeService, inventoryService);
  const controller = new ProductionController(productionService);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get<{ Querystring: { date: string } }>('/batches', (req, reply) => controller.getBatches(req, reply));
  app.get<{ Params: { id: string } }>('/batches/:id', (req, reply) => controller.getBatchById(req, reply));
  app.post('/batches/generate', (req, reply) => controller.generateBatches(req, reply));
  app.post('/batches', (req, reply) => controller.createBatch(req, reply));
  app.patch<{ Params: { id: string } }>('/batches/:id/stage', (req, reply) => controller.updateStage(req, reply));
  app.put<{ Params: { id: string } }>('/batches/:id', (req, reply) => controller.updateBatch(req, reply));
  app.delete<{ Params: { id: string } }>('/batches/:id', (req, reply) => controller.deleteBatch(req, reply));
  app.post<{ Params: { id: string } }>('/batches/:id/split', (req, reply) => controller.splitBatch(req, reply));
  app.post('/batches/merge', (req, reply) => controller.mergeBatches(req, reply));
  app.get<{ Querystring: { date: string } }>('/prep-list', (req, reply) => controller.getPrepList(req, reply));
  app.patch<{ Params: { id: string } }>('/prep-list/:id', (req, reply) => controller.togglePrepItem(req, reply));
  app.get<{ Querystring: { date: string } }>('/timeline', (req, reply) => controller.getTimeline(req, reply));
}
