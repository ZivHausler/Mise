import type { FastifyRequest, FastifyReply } from 'fastify';
import type { OrderService } from './order.service.js';
import type { OrderStatus } from './order.types.js';
import { createOrderSchema, updateOrderStatusSchema, updateOrderSchema, calendarRangeSchema, calendarAggregatesSchema, calendarDaySchema } from './order.schema.js';
import { parsePaginationParams } from '../../core/types/pagination.js';

export class OrderController {
  constructor(private orderService: OrderService) {}

  async getAll(request: FastifyRequest<{ Querystring: { status?: string; excludePaid?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const statusParam = request.query.status;
    const filters: { status?: OrderStatus; excludePaid?: boolean } = {};
    if (statusParam !== undefined) filters.status = Number(statusParam) as OrderStatus;
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
    const { page, limit, offset } = parsePaginationParams(request.query.page, request.query.limit);
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
    const order = await this.orderService.create(storeId, data, request.id);
    return reply.status(201).send({ success: true, data: order });
  }

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { status } = updateOrderStatusSchema.parse(request.body);
    const order = await this.orderService.updateStatus(storeId, request.params.id, status as OrderStatus, request.id);
    return reply.send({ success: true, data: order });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateOrderSchema.parse(request.body);
    const order = await this.orderService.update(storeId, request.params.id, data);
    return reply.send({ success: true, data: order });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.orderService.delete(storeId, request.params.id);
    return reply.status(204).send();
  }

  async getCalendarRange(request: FastifyRequest<{ Querystring: { from: string; to: string; status?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const query = calendarRangeSchema.parse(request.query);
    const orders = await this.orderService.getByDateRange(storeId, { from: query.from, to: query.to, status: query.status });
    return reply.send({ success: true, data: orders });
  }

  async getCalendarAggregates(request: FastifyRequest<{ Querystring: { from: string; to: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const query = calendarAggregatesSchema.parse(request.query);
    const aggregates = await this.orderService.getCalendarAggregates(storeId, { from: query.from, to: query.to });
    return reply.send({ success: true, data: aggregates });
  }

  async getCalendarDay(request: FastifyRequest<{ Querystring: { date: string; status?: string; page?: string; limit?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const query = calendarDaySchema.parse(request.query);
    const { page, limit, offset } = parsePaginationParams(query.page, query.limit, 20);
    const { orders, total } = await this.orderService.getByDay(storeId, { date: query.date, status: query.status, limit, offset });
    return reply.send({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }
}
