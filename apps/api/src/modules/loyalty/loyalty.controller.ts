import type { FastifyRequest, FastifyReply } from 'fastify';
import type { LoyaltyService } from './loyalty.service.js';
import { adjustLoyaltySchema, redeemLoyaltySchema, updateLoyaltyConfigSchema } from './loyalty.schema.js';
import { parsePaginationParams } from '../../core/types/pagination.js';

export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  async getCustomerBalance(request: FastifyRequest<{ Params: { customerId: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const summary = await this.loyaltyService.getCustomerBalance(storeId, request.params.customerId);
    return reply.send({ success: true, data: summary });
  }

  async getCustomerTransactions(
    request: FastifyRequest<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string } }>,
    reply: FastifyReply,
  ) {
    const storeId = request.currentUser!.storeId!;
    const { page, limit, offset } = parsePaginationParams(request.query.page, request.query.limit);
    const { items, total } = await this.loyaltyService.getCustomerTransactions(storeId, request.params.customerId, { limit, offset });
    return reply.send({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async adjustPoints(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = adjustLoyaltySchema.parse(request.body);
    const transaction = await this.loyaltyService.adjustPoints(storeId, data.customerId, data.points, data.description);
    return reply.status(201).send({ success: true, data: transaction });
  }

  async redeemPoints(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = redeemLoyaltySchema.parse(request.body);
    const result = await this.loyaltyService.redeemPoints(storeId, data.customerId, data.points);
    return reply.send({ success: true, data: result });
  }

  async getConfig(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const config = await this.loyaltyService.getConfig(storeId);
    return reply.send({ success: true, data: config });
  }

  async updateConfig(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateLoyaltyConfigSchema.parse(request.body);
    const config = await this.loyaltyService.upsertConfig(storeId, data);
    return reply.send({ success: true, data: config });
  }
}
