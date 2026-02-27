import type { FastifyRequest, FastifyReply } from 'fastify';
import type { OrderService } from './order.service.js';
import type { OrderStatus } from './order.types.js';
import { createOrderSchema, createRecurringOrderSchema, updateOrderStatusSchema, updateOrderSchema, calendarRangeSchema, calendarAggregatesSchema, calendarDaySchema } from './order.schema.js';
import { parsePaginationParams } from '../../core/types/pagination.js';
import { pdfQuerySchema } from '../shared/pdf/pdfSchema.js';
import { generateOrderPdf } from '../shared/pdf/orderPdf.js';
import { t } from '../shared/pdf/i18n.js';
import { PgStoreRepository } from '../stores/store.repository.js';

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

  async getAllPaginated(request: FastifyRequest<{ Querystring: { page?: string; limit?: string; status?: string; excludePaid?: string; dateFrom?: string; dateTo?: string; search?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { page, limit, offset } = parsePaginationParams(request.query.page, request.query.limit);
    const filters: { status?: OrderStatus; excludePaid?: boolean; dateFrom?: string; dateTo?: string; search?: string } = {};
    if (request.query.status !== undefined) filters.status = Number(request.query.status) as OrderStatus;
    if (request.query.excludePaid === 'true') filters.excludePaid = true;
    if (request.query.dateFrom) filters.dateFrom = request.query.dateFrom;
    if (request.query.dateTo) filters.dateTo = request.query.dateTo;
    if (request.query.search) filters.search = request.query.search;
    const { orders, total } = await this.orderService.getAllPaginated(storeId, { limit, offset }, Object.keys(filters).length ? filters : undefined);
    return reply.send({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const order = await this.orderService.getById(storeId, Number(request.params.id));
    return reply.send({ success: true, data: order });
  }

  async getPdf(request: FastifyRequest<{ Params: { id: string }; Querystring: { lang?: string; dateFormat?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const userId = request.currentUser!.userId!;
    const { lang, dateFormat } = pdfQuerySchema.parse(request.query);

    const order = await this.orderService.getById(storeId, Number(request.params.id));
    const stores = await PgStoreRepository.getUserStores(userId);
    const storeName = stores.find((s) => s.storeId === storeId)?.store?.name ?? '';
    const currency = t(lang, 'common.currency', '\u20AA');

    const pdf = generateOrderPdf(order, { lang, dateFormat, currency, storeName });
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'attachment; filename="order.pdf"')
      .send(pdf);
  }

  async getByCustomerId(request: FastifyRequest<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string; status?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { page, limit, offset } = parsePaginationParams(request.query.page, request.query.limit);
    const filters: { status?: number; dateFrom?: string; dateTo?: string; sortBy?: 'created_at' | 'order_number'; sortDir?: 'asc' | 'desc' } = {};
    if (request.query.status !== undefined && request.query.status !== '') filters.status = Number(request.query.status);
    if (request.query.dateFrom) filters.dateFrom = request.query.dateFrom;
    if (request.query.dateTo) filters.dateTo = request.query.dateTo;
    if (request.query.sortBy === 'created_at' || request.query.sortBy === 'order_number') filters.sortBy = request.query.sortBy;
    if (request.query.sortDir === 'asc' || request.query.sortDir === 'desc') filters.sortDir = request.query.sortDir;
    const { orders, total } = await this.orderService.getByCustomerId(storeId, Number(request.params.customerId), { limit, offset }, Object.keys(filters).length ? filters : undefined);
    return reply.send({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createOrderSchema.parse(request.body);
    const order = await this.orderService.create(storeId, data, request.id);
    return reply.status(201).send({ success: true, data: order });
  }

  async createRecurring(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { recurrence, ...orderData } = createRecurringOrderSchema.parse(request.body);
    const dueDate = new Date(orderData.dueDate);
    const orders = await this.orderService.createBatch(storeId, { ...orderData, dueDate }, recurrence, request.id);
    return reply.status(201).send({ success: true, data: { generatedCount: orders.length, orders } });
  }

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { status } = updateOrderStatusSchema.parse(request.body);
    const order = await this.orderService.updateStatus(storeId, Number(request.params.id), status as OrderStatus, request.id);
    return reply.send({ success: true, data: order });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateOrderSchema.parse(request.body);
    const order = await this.orderService.update(storeId, Number(request.params.id), data);
    return reply.send({ success: true, data: order });
  }

  async updateRecurring(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateOrderSchema.parse(request.body);
    const { updated, futureUpdated } = await this.orderService.updateFutureRecurring(storeId, Number(request.params.id), data);
    return reply.send({ success: true, data: { order: updated, futureUpdated } });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.orderService.delete(storeId, Number(request.params.id));
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
