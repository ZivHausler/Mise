import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { OrderService } from './order.service.js';

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    recipeId: z.string().max(100),
    quantity: z.number().int().positive().max(10000),
    notes: z.string().max(1000).optional(),
  })).min(1).max(100),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['received', 'in_progress', 'ready', 'delivered']),
});

const updateOrderSchema = z.object({
  notes: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
});

export class OrderController {
  constructor(private orderService: OrderService) {}

  async getAll(request: FastifyRequest<{ Querystring: { status?: string } }>, reply: FastifyReply) {
    const filters = request.query.status ? { status: request.query.status as any } : undefined;
    const orders = await this.orderService.getAll(filters);
    return reply.send({ success: true, data: orders });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const order = await this.orderService.getById(request.params.id);
    return reply.send({ success: true, data: order });
  }

  async getByCustomerId(request: FastifyRequest<{ Params: { customerId: string } }>, reply: FastifyReply) {
    const orders = await this.orderService.getByCustomerId(request.params.customerId);
    return reply.send({ success: true, data: orders });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createOrderSchema.parse(request.body);
    const order = await this.orderService.create(data as any);
    return reply.status(201).send({ success: true, data: order });
  }

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { status } = updateOrderStatusSchema.parse(request.body);
    const order = await this.orderService.updateStatus(request.params.id, status);
    return reply.send({ success: true, data: order });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const data = updateOrderSchema.parse(request.body);
    const order = await this.orderService.update(request.params.id, data as any);
    return reply.send({ success: true, data: order });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await this.orderService.delete(request.params.id);
    return reply.status(204).send();
  }
}
