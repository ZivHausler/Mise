import type { FastifyInstance } from 'fastify';
import { InvoiceController } from './invoice.controller.js';
import { InvoiceService } from './invoice.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { StoreRole } from '../stores/store.types.js';
import { ForbiddenError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

async function requireOwnerOrManager(request: import('fastify').FastifyRequest, _reply: import('fastify').FastifyReply) {
  const role = request.currentUser?.storeRole;
  const isAdmin = request.currentUser?.isAdmin;
  if (role !== StoreRole.OWNER && role !== StoreRole.MANAGER && !isAdmin) {
    throw new ForbiddenError('Only owners and managers can manage invoices', ErrorCode.FORBIDDEN);
  }
}

export default async function invoiceRoutes(app: FastifyInstance) {
  const service = new InvoiceService();
  const controller = new InvoiceController(service);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);
  app.addHook('preHandler', requireOwnerOrManager);

  app.post('/', (req, reply) => controller.create(req, reply));
  app.post<{ Params: { id: string } }>('/:id/credit-note', (req, reply) => controller.createCreditNote(req, reply));
  app.get<{ Querystring: Record<string, string> }>('/', (req, reply) => controller.getAll(req, reply));
  app.get<{ Params: { id: string } }>('/:id', (req, reply) => controller.getById(req, reply));
  app.get<{ Params: { id: string }; Querystring: { lang?: string; dateFormat?: string } }>('/:id/pdf', (req, reply) => controller.getPdf(req, reply));
  app.get<{ Params: { orderId: string } }>('/order/:orderId', (req, reply) => controller.getByOrderId(req, reply));
}
