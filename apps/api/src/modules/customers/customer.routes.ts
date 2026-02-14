import type { FastifyInstance } from 'fastify';
import { CustomerController } from './customer.controller.js';
import { CustomerService } from './customer.service.js';
import { PgCustomerRepository } from './customer.repository.js';
import { authMiddleware } from '../../core/middleware/auth.js';

export default async function customerRoutes(app: FastifyInstance) {
  const repository = new PgCustomerRepository();
  const service = new CustomerService(repository);
  const controller = new CustomerController(service);

  app.addHook('preHandler', authMiddleware);

  app.get('/', (req, reply) => controller.getAll(req as any, reply));
  app.get('/:id', (req, reply) => controller.getById(req as any, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put('/:id', (req, reply) => controller.update(req as any, reply));
  app.delete('/:id', (req, reply) => controller.delete(req as any, reply));
}
