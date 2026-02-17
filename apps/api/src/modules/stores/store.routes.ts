import type { FastifyInstance } from 'fastify';
import { StoreController } from './store.controller.js';
import { StoreService } from './store.service.js';
import { authMiddleware } from '../../core/middleware/auth.js';

export default async function storeRoutes(app: FastifyInstance) {
  const service = new StoreService(app);
  const controller = new StoreController(service);

  // Public route - validate invitation token
  app.get('/invite/:token', (req, reply) => controller.validateInvite(req as any, reply));

  // Auth-required routes (no store needed)
  app.post('/', { preHandler: [authMiddleware] }, (req, reply) => controller.createStore(req, reply));
  app.get('/my', { preHandler: [authMiddleware] }, (req, reply) => controller.getMyStores(req, reply));
  app.post('/select', { preHandler: [authMiddleware] }, (req, reply) => controller.selectStore(req, reply));

  // Auth + store required routes
  app.get('/members', { preHandler: [authMiddleware] }, (req, reply) => controller.getMembers(req, reply));
  app.post('/invite', { preHandler: [authMiddleware] }, (req, reply) => controller.sendInvite(req, reply));
}
