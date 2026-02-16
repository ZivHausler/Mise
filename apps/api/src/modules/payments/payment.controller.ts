import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { PaymentService } from './payment.service.js';

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive().max(10000000),
  method: z.enum(['cash', 'credit_card']),
  notes: z.string().max(1000).optional(),
});

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  async getAll(request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply: FastifyReply) {
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 10));
    const offset = (page - 1) * limit;
    const { items, total } = await this.paymentService.getAll({ limit, offset });
    return reply.send({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async getByCustomerId(request: FastifyRequest<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string } }>, reply: FastifyReply) {
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 10));
    const offset = (page - 1) * limit;
    const { items, total } = await this.paymentService.getByCustomerId(request.params.customerId, { limit, offset });
    return reply.send({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async getByOrderId(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    const payments = await this.paymentService.getByOrderId(request.params.orderId);
    return reply.send({ success: true, data: payments });
  }

  async getPaymentSummary(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    const summary = await this.paymentService.getPaymentSummary(request.params.orderId);
    return reply.send({ success: true, data: summary });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createPaymentSchema.parse(request.body);
    const payment = await this.paymentService.create(data);
    return reply.status(201).send({ success: true, data: payment });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await this.paymentService.delete(request.params.id);
    return reply.status(204).send();
  }
}
