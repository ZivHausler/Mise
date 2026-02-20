import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StoreController } from './store.controller.js';
import { StoreService } from './store.service.js';
import { authMiddleware, requireAdminMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import { env } from '../../config/env.js';

async function adminAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== env.ADMIN_SECRET) {
    throw new UnauthorizedError('Invalid admin credentials');
  }
}

export default async function storeRoutes(app: FastifyInstance) {
  const service = new StoreService(app);
  const controller = new StoreController(service);

  // Public route - validate invitation token
  app.get<{ Params: { token: string } }>('/invite/:token', (req, reply) => controller.validateInvite(req, reply));

  // Admin route - create-store invitation (rate limited: 50 per 15 min)
  app.post('/admin/invite-create-store', {
    preHandler: [adminAuthMiddleware],
    config: {
      rateLimit: {
        max: 50,
        timeWindow: '15 minutes',
      },
    },
  }, (req, reply) => controller.adminCreateStoreInvite(req, reply));

  // Admin route - get all stores
  app.get('/all', { preHandler: [authMiddleware, requireAdminMiddleware] }, (req, reply) => controller.getAllStores(req, reply));

  // Auth-required routes (no store needed)
  app.post('/', { preHandler: [authMiddleware] }, (req, reply) => controller.createStore(req, reply));
  app.get('/my', { preHandler: [authMiddleware] }, (req, reply) => controller.getMyStores(req, reply));
  app.post('/select', { preHandler: [authMiddleware] }, (req, reply) => controller.selectStore(req, reply));
  app.post('/accept-invite', { preHandler: [authMiddleware] }, (req, reply) => controller.acceptInvite(req, reply));

  // Auth + store required routes
  app.get('/members', { preHandler: [authMiddleware, requireStoreMiddleware] }, (req, reply) => controller.getMembers(req, reply));
  app.get('/invitations/pending', { preHandler: [authMiddleware, requireStoreMiddleware] }, (req, reply) => controller.getPendingInvitations(req, reply));
  app.post('/invite', {
    preHandler: [authMiddleware, requireStoreMiddleware],
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
      },
    },
  }, (req, reply) => controller.sendInvite(req, reply));
}
