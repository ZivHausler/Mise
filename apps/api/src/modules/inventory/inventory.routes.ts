import type { FastifyInstance } from 'fastify';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { PgInventoryRepository } from './inventory.repository.js';
import { InMemoryEventBus } from '../../core/events/event-bus.js';
import { authMiddleware } from '../../core/middleware/auth.js';

export default async function inventoryRoutes(app: FastifyInstance) {
  const repository = new PgInventoryRepository();
  const eventBus = (app as any).container?.resolve?.('eventBus') ?? new InMemoryEventBus();
  const service = new InventoryService(repository, eventBus);
  const controller = new InventoryController(service);

  app.addHook('preHandler', authMiddleware);

  app.get('/', (req, reply) => controller.getAll(req as any, reply));
  app.get('/low-stock', (req, reply) => controller.getLowStock(req, reply));
  app.get('/:id', (req, reply) => controller.getById(req as any, reply));
  app.get('/:id/log', (req, reply) => controller.getLog(req as any, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put('/:id', (req, reply) => controller.update(req as any, reply));
  app.post('/adjust', (req, reply) => controller.adjustStock(req, reply));
  app.delete('/:id', (req, reply) => controller.delete(req as any, reply));
}
