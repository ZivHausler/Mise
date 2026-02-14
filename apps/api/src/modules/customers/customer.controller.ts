import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { CustomerService } from './customer.service.js';

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  preferences: z.object({
    allergies: z.array(z.string().max(100)).max(50).optional(),
    favorites: z.array(z.string().max(100)).max(50).optional(),
  }).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

export class CustomerController {
  constructor(private customerService: CustomerService) {}

  async getAll(request: FastifyRequest<{ Querystring: { search?: string } }>, reply: FastifyReply) {
    const customers = await this.customerService.getAll(request.query.search);
    return reply.send({ success: true, data: customers });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const customer = await this.customerService.getById(request.params.id);
    return reply.send({ success: true, data: customer });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createCustomerSchema.parse(request.body);
    const customer = await this.customerService.create(data);
    return reply.status(201).send({ success: true, data: customer });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const data = updateCustomerSchema.parse(request.body);
    const customer = await this.customerService.update(request.params.id, data);
    return reply.send({ success: true, data: customer });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await this.customerService.delete(request.params.id);
    return reply.status(204).send();
  }
}
