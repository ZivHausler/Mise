import type { FastifyRequest, FastifyReply } from 'fastify';
import type { OrderService } from './order.service.js';
import type { OrderStatus } from './order.types.js';
import { createOrderSchema, updateOrderStatusSchema, updateOrderSchema } from './order.schema.js';

export class OrderController {
  constructor(private orderService: OrderService) {}

  async getAll(request: FastifyRequest<{ Querystring: { status?: string; excludePaid?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const statusParam = request.query.status;
    const filters: { status?: any; excludePaid?: boolean } = {};
    if (statusParam !== undefined) filters.status = Number(statusParam) as any;
    if (request.query.excludePaid === 'true') filters.excludePaid = true;
    const orders = await this.orderService.getAll(storeId, Object.keys(filters).length ? filters : undefined);
    return reply.send({ success: true, data: orders });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const order = await this.orderService.getById(storeId, request.params.id);
    return reply.send({ success: true, data: order });
  }

  async getByCustomerId(request: FastifyRequest<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string; status?: string; dateFrom?: string; dateTo?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 10));
    const offset = (page - 1) * limit;
    const filters: { status?: number; dateFrom?: string; dateTo?: string } = {};
    if (request.query.status !== undefined && request.query.status !== '') filters.status = Number(request.query.status);
    if (request.query.dateFrom) filters.dateFrom = request.query.dateFrom;
    if (request.query.dateTo) filters.dateTo = request.query.dateTo;
    const { orders, total } = await this.orderService.getByCustomerId(storeId, request.params.customerId, { limit, offset }, Object.keys(filters).length ? filters : undefined);
    return reply.send({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createOrderSchema.parse(request.body);
    const order = await this.orderService.create(storeId, data as any);
    return reply.status(201).send({ success: true, data: order });
  }

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { status } = updateOrderStatusSchema.parse(request.body);
    const order = await this.orderService.updateStatus(storeId, request.params.id, status as OrderStatus);
    return reply.send({ success: true, data: order });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateOrderSchema.parse(request.body);
    const order = await this.orderService.update(storeId, request.params.id, data as any);
    return reply.send({ success: true, data: order });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.orderService.delete(storeId, request.params.id);
    return reply.status(204).send();
  }
}
