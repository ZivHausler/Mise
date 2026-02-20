import type { FastifyInstance } from 'fastify';
import { CustomerController } from './customer.controller.js';
import { CustomerService } from './customer.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

export default async function customerRoutes(app: FastifyInstance) {
  const service = new CustomerService();
  const controller = new CustomerController(service);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get<{ Querystring: { search?: string } }>('/', (req, reply) => controller.getAll(req, reply));
  app.get<{ Params: { id: string } }>('/:id', (req, reply) => controller.getById(req, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put<{ Params: { id: string } }>('/:id', (req, reply) => controller.update(req, reply));
  app.delete<{ Params: { id: string } }>('/:id', (req, reply) => controller.delete(req, reply));
}
