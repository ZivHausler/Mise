import type { FastifyInstance } from 'fastify';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

export default async function inventoryRoutes(app: FastifyInstance) {
  const service = new InventoryService();
  const controller = new InventoryController(service);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get<{ Querystring: { search?: string; page?: string; limit?: string; groupIds?: string; status?: string } }>('/', (req, reply) => controller.getAll(req, reply));
  app.get('/low-stock', (req, reply) => controller.getLowStock(req, reply));
  app.get<{ Params: { id: string } }>('/:id', (req, reply) => controller.getById(req, reply));
  app.get<{ Params: { id: string } }>('/:id/log', (req, reply) => controller.getLog(req, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put<{ Params: { id: string } }>('/:id', (req, reply) => controller.update(req, reply));
  app.post('/adjust', (req, reply) => controller.adjustStock(req, reply));
  app.delete<{ Params: { id: string } }>('/:id', (req, reply) => controller.delete(req, reply));
}
