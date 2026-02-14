import type { FastifyInstance } from 'fastify';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { PgPaymentRepository } from './payment.repository.js';
import { InMemoryEventBus } from '../../core/events/event-bus.js';
import { authMiddleware } from '../../core/middleware/auth.js';

export default async function paymentRoutes(app: FastifyInstance) {
  const repository = new PgPaymentRepository();
  const eventBus = (app as any).container?.resolve?.('eventBus') ?? new InMemoryEventBus();
  const service = new PaymentService(repository, eventBus);
  const controller = new PaymentController(service);

  app.addHook('preHandler', authMiddleware);

  app.get('/order/:orderId', (req, reply) => controller.getByOrderId(req as any, reply));
  app.get('/order/:orderId/summary', (req, reply) => controller.getPaymentSummary(req as any, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.delete('/:id', (req, reply) => controller.delete(req as any, reply));
}
