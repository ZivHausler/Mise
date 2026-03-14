import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { RecipeService } from '../recipes/recipe.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PayPalOrdersService } from '../storefront/paypal-orders.service.js';
import { InvoiceService } from '../invoices/invoice.service.js';
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

export default async function orderRoutes(app: FastifyInstance) {
  const inventoryService = new InventoryService();
  const recipeService = new RecipeService(inventoryService);
  const paypalOrdersService = new PayPalOrdersService();
  const invoiceService = new InvoiceService();
  const orderService = new OrderService(recipeService, inventoryService, paypalOrdersService, invoiceService);
  const controller = new OrderController(orderService);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get<{ Querystring: { status?: string; excludePaid?: string } }>('/', (req, reply) => controller.getAll(req, reply));
  app.get<{ Querystring: { page?: string; limit?: string; status?: string; excludePaid?: string; dateFrom?: string; dateTo?: string; search?: string } }>('/list', (req, reply) => controller.getAllPaginated(req, reply));
  app.get<{ Querystring: { from: string; to: string; status?: string } }>('/calendar/range', (req, reply) => controller.getCalendarRange(req, reply));
  app.get<{ Querystring: { from: string; to: string } }>('/calendar/aggregates', (req, reply) => controller.getCalendarAggregates(req, reply));
  app.get<{ Querystring: { date: string; status?: string; page?: string; limit?: string } }>('/calendar/day', (req, reply) => controller.getCalendarDay(req, reply));
  // Approval & cancellation routes (static paths must be registered before /:id)
  app.get('/pending-count', (req, reply) => controller.getPendingCount(req, reply));

  app.get<{ Params: { id: string } }>('/:id', (req, reply) => controller.getById(req, reply));
  app.get<{ Params: { id: string }; Querystring: { lang?: string; dateFormat?: string } }>('/:id/pdf', (req, reply) => controller.getPdf(req, reply));
  app.get<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string; status?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: string } }>('/customer/:customerId', (req, reply) => controller.getByCustomerId(req, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.post('/recurring', (req, reply) => controller.createRecurring(req, reply));
  app.patch<{ Params: { id: string } }>('/:id/status', (req, reply) => controller.updateStatus(req, reply));
  app.patch<{ Params: { id: string } }>('/:id/approve', { preHandler: [requireOwnerOrManager] }, (req, reply) => controller.approve(req, reply));
  app.patch<{ Params: { id: string } }>('/:id/cancel', { preHandler: [requireOwnerOrManager] }, (req, reply) => controller.cancel(req, reply));
  app.patch<{ Params: { id: string } }>('/:id/cancellation-request/approve', { preHandler: [requireOwnerOrManager] }, (req, reply) => controller.approveCancellation(req, reply));
  app.patch<{ Params: { id: string } }>('/:id/cancellation-request/decline', { preHandler: [requireOwnerOrManager] }, (req, reply) => controller.declineCancellation(req, reply));
  app.put<{ Params: { id: string } }>('/:id', (req, reply) => controller.update(req, reply));
  app.put<{ Params: { id: string } }>('/:id/recurring', (req, reply) => controller.updateRecurring(req, reply));
  app.delete<{ Params: { id: string } }>('/:id', (req, reply) => controller.delete(req, reply));
}
