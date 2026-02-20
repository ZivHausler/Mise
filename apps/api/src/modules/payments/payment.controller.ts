import type { FastifyRequest, FastifyReply } from 'fastify';
import type { PaymentService } from './payment.service.js';
import { createPaymentSchema } from './payment.schema.js';
import { parsePaginationParams } from '../../core/types/pagination.js';

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  async getAll(request: FastifyRequest<{ Querystring: { page?: string; limit?: string; status?: string; method?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { page, limit, offset } = parsePaginationParams(request.query.page, request.query.limit);
    const filters: { status?: string; method?: string } = {};
    if (request.query.status) filters.status = request.query.status;
    if (request.query.method) filters.method = request.query.method;
    const { items, total } = await this.paymentService.getAll(storeId, { limit, offset }, Object.keys(filters).length ? filters : undefined);
    return reply.send({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async getByCustomerId(request: FastifyRequest<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string; method?: string; dateFrom?: string; dateTo?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { page, limit, offset } = parsePaginationParams(request.query.page, request.query.limit);
    const filters: { method?: string; dateFrom?: string; dateTo?: string } = {};
    if (request.query.method) filters.method = request.query.method;
    if (request.query.dateFrom) filters.dateFrom = request.query.dateFrom;
    if (request.query.dateTo) filters.dateTo = request.query.dateTo;
    const { items, total } = await this.paymentService.getByCustomerId(storeId, request.params.customerId, { limit, offset }, Object.keys(filters).length ? filters : undefined);
    return reply.send({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async getByOrderId(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const payments = await this.paymentService.getByOrderId(storeId, request.params.orderId);
    return reply.send({ success: true, data: payments });
  }

  async getPaymentSummary(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const summary = await this.paymentService.getPaymentSummary(storeId, request.params.orderId);
    return reply.send({ success: true, data: summary });
  }

  async getStatuses(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const statuses = await this.paymentService.getPaymentStatuses(storeId);
    return reply.send({ success: true, data: statuses });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createPaymentSchema.parse(request.body);
    const payment = await this.paymentService.create(storeId, data, request.id);
    return reply.status(201).send({ success: true, data: payment });
  }

  async refund(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const payment = await this.paymentService.refund(storeId, request.params.id, request.id);
    return reply.send({ success: true, data: payment });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.paymentService.delete(storeId, request.params.id);
    return reply.status(204).send();
  }
}
