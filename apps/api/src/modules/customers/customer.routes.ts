import type { FastifyInstance } from 'fastify';
import { CustomerController } from './customer.controller.js';
import { CustomerService } from './customer.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { requireFeature } from '../../core/middleware/requireFeature.js';

export default async function customerRoutes(app: FastifyInstance) {
  const service = new CustomerService();
  const loyaltyService = new LoyaltyService();
  const controller = new CustomerController(service);
  controller.setLoyaltyService(loyaltyService);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get('/segments', { preHandler: [requireFeature('loyalty_enhancements')] }, (req, reply) => controller.getSegments(req, reply));
  app.get<{ Querystring: { search?: string; segment?: string } }>('/', (req, reply) => controller.getAll(req, reply));
  app.get<{ Params: { id: string } }>('/:id', (req, reply) => controller.getById(req, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put<{ Params: { id: string } }>('/:id', (req, reply) => controller.update(req, reply));
  app.delete<{ Params: { id: string } }>('/:id', (req, reply) => controller.delete(req, reply));
}
