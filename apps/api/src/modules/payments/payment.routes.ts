import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { OrderService } from '../orders/order.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { StoreRole } from '../stores/store.types.js';
import { ForbiddenError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

async function requireOwnerOrManager(request: FastifyRequest, _reply: FastifyReply) {
  const role = request.currentUser?.storeRole;
  const isAdmin = request.currentUser?.isAdmin;
  if (role !== StoreRole.OWNER && role !== StoreRole.MANAGER && !isAdmin) {
    throw new ForbiddenError('Only owners and managers can perform this action', ErrorCode.FORBIDDEN);
  }
}

export default async function paymentRoutes(app: FastifyInstance) {
  const orderService = new OrderService();
  const service = new PaymentService(orderService);
  const controller = new PaymentController(service);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get<{ Querystring: { page?: string; limit?: string; status?: string; method?: string; dateFrom?: string; dateTo?: string } }>('/', (req, reply) => controller.getAll(req, reply));
  app.get('/statuses', (req, reply) => controller.getStatuses(req, reply));
  app.get<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string; method?: string; dateFrom?: string; dateTo?: string } }>('/customer/:customerId', (req, reply) => controller.getByCustomerId(req, reply));
  app.get<{ Params: { orderId: string } }>('/order/:orderId', (req, reply) => controller.getByOrderId(req, reply));
  app.get<{ Params: { orderId: string } }>('/order/:orderId/summary', (req, reply) => controller.getPaymentSummary(req, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.post<{ Params: { id: string } }>('/:id/refund', { preHandler: requireOwnerOrManager }, (req, reply) => controller.refund(req, reply));
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: requireOwnerOrManager }, (req, reply) => controller.delete(req, reply));
}
