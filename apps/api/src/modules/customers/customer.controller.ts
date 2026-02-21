import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CustomerService } from './customer.service.js';
import { createCustomerSchema, updateCustomerSchema } from './customer.schema.js';

export class CustomerController {
  constructor(private customerService: CustomerService) {}

  async getAll(request: FastifyRequest<{ Querystring: { search?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const customers = await this.customerService.getAll(storeId, request.query.search);
    return reply.send({ success: true, data: customers });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const customer = await this.customerService.getById(Number(request.params.id), storeId);
    return reply.send({ success: true, data: customer });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createCustomerSchema.parse(request.body);
    const customer = await this.customerService.create(storeId, data);
    return reply.status(201).send({ success: true, data: customer });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateCustomerSchema.parse(request.body);
    const customer = await this.customerService.update(Number(request.params.id), storeId, data);
    return reply.send({ success: true, data: customer });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.customerService.delete(Number(request.params.id), storeId);
    return reply.status(204).send();
  }
}
