import type { FastifyInstance } from 'fastify';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { OrderService } from '../orders/order.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

export default async function paymentRoutes(app: FastifyInstance) {
  const orderService = new OrderService();
  const service = new PaymentService(orderService);
  const controller = new PaymentController(service);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get('/', (req, reply) => controller.getAll(req as any, reply));
  app.get('/statuses', (req, reply) => controller.getStatuses(req, reply));
  app.get('/customer/:customerId', (req, reply) => controller.getByCustomerId(req as any, reply));
  app.get('/order/:orderId', (req, reply) => controller.getByOrderId(req as any, reply));
  app.get('/order/:orderId/summary', (req, reply) => controller.getPaymentSummary(req as any, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.post('/:id/refund', (req, reply) => controller.refund(req as any, reply));
  app.delete('/:id', (req, reply) => controller.delete(req as any, reply));
}
