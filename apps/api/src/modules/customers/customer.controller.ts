import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CustomerService } from './customer.service.js';
import type { LoyaltyService } from '../loyalty/loyalty.service.js';
import type { CustomerSegment } from '../loyalty/loyalty.types.js';
import { createCustomerSchema, updateCustomerSchema } from './customer.schema.js';
import { segmentFilterSchema } from '../loyalty/loyalty.schema.js';
import { isFeatureEnabled } from '../../core/middleware/requireFeature.js';

export class CustomerController {
  private loyaltyService: LoyaltyService | null = null;

  constructor(private customerService: CustomerService) {}

  setLoyaltyService(loyaltyService: LoyaltyService) {
    this.loyaltyService = loyaltyService;
  }

  async getSegments(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = await this.loyaltyService!.getSegmentCounts(storeId);
    return reply.send({ success: true, data });
  }

  async getAll(request: FastifyRequest<{ Querystring: { search?: string; segment?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    let segment = segmentFilterSchema.parse(request.query.segment) as CustomerSegment | undefined;
    if (segment && !isFeatureEnabled('loyalty_enhancements', storeId)) {
      segment = undefined;
    }
    const customers = await this.customerService.getAll(storeId, request.query.search, segment);
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
