import type { FastifyInstance } from 'fastify';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { ReceiptScannerService } from './receipt-scanner.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { requireTier } from '../../core/middleware/requireTier.js';
import { StoreRole } from '../stores/store.types.js';
import { ForbiddenError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

async function requireOwnerOrManager(request: import('fastify').FastifyRequest, _reply: import('fastify').FastifyReply) {
  const role = request.currentUser?.storeRole;
  const isAdmin = request.currentUser?.isAdmin;
  if (role !== StoreRole.OWNER && role !== StoreRole.MANAGER && !isAdmin) {
    throw new ForbiddenError('Only owners and managers can perform this action', ErrorCode.FORBIDDEN);
  }
}

export default async function inventoryRoutes(app: FastifyInstance) {
  const service = new InventoryService();
  const receiptScannerService = new ReceiptScannerService();
  const controller = new InventoryController(service, receiptScannerService);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get<{ Querystring: { search?: string; page?: string; limit?: string; groupIds?: string; status?: string } }>('/', (req, reply) => controller.getAll(req, reply));
  app.get('/low-stock', (req, reply) => controller.getLowStock(req, reply));
  app.get<{ Querystring: { lang?: string; dateFormat?: string } }>('/shopping-list/pdf', (req, reply) => controller.getShoppingListPdf(req, reply));
  app.get<{ Params: { id: string } }>('/:id', (req, reply) => controller.getById(req, reply));
  app.get<{ Params: { id: string } }>('/:id/log', (req, reply) => controller.getLog(req, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put<{ Params: { id: string } }>('/:id', (req, reply) => controller.update(req, reply));
  app.post('/adjust', (req, reply) => controller.adjustStock(req, reply));
  app.delete<{ Params: { id: string } }>('/:id', (req, reply) => controller.delete(req, reply));

  // Register multipart only for scan route
  app.register(async function scanRoutes(sub) {
    await sub.register(import('@fastify/multipart'), { limits: { fileSize: 5 * 1024 * 1024 } });
    sub.post('/scan-receipt', {
      preHandler: [requireTier('receipt_scanner')],
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    }, (req, reply) => controller.scanReceipt(req, reply));
  });

  // Bulk operations (owner/manager only)
  app.post('/adjust-bulk', { preHandler: [requireOwnerOrManager] }, (req, reply) => controller.adjustBulk(req, reply));
  app.post('/bulk-delete', { preHandler: [requireOwnerOrManager] }, (req, reply) => controller.deleteBulk(req, reply));
}
