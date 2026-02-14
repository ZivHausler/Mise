import type { FastifyInstance } from 'fastify';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { PgOrderRepository } from './order.repository.js';
import { InMemoryEventBus } from '../../core/events/event-bus.js';
import { authMiddleware } from '../../core/middleware/auth.js';

export default async function orderRoutes(app: FastifyInstance) {
  const repository = new PgOrderRepository();
  const eventBus = (app as any).container?.resolve?.('eventBus') ?? new InMemoryEventBus();
  const service = new OrderService(repository, eventBus);
  const controller = new OrderController(service);

  app.addHook('preHandler', authMiddleware);

  app.get('/', (req, reply) => controller.getAll(req as any, reply));
  app.get('/:id', (req, reply) => controller.getById(req as any, reply));
  app.get('/customer/:customerId', (req, reply) => controller.getByCustomerId(req as any, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.patch('/:id/status', (req, reply) => controller.updateStatus(req as any, reply));
  app.put('/:id', (req, reply) => controller.update(req as any, reply));
  app.delete('/:id', (req, reply) => controller.delete(req as any, reply));
}
