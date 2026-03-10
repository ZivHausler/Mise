import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SubscriptionService } from './subscription.service.js';
import { changePlanSchema, adminChangePlanSchema, previewChangeQuerySchema, paymentsQuerySchema } from './subscription.schema.js';
import { ValidationError } from '../../core/errors/app-error.js';
import type { PlanSlug } from './subscription.types.js';

export class SubscriptionController {
  constructor(private service: SubscriptionService) {}

  async getSubscription(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const subscription = await this.service.getStoreSubscription(storeId);
    return reply.send({ success: true, data: subscription });
  }

  async getPlans(_request: FastifyRequest, reply: FastifyReply) {
    const plans = await this.service.getPlans();
    return reply.send({ success: true, data: plans });
  }

  async changePlan(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const actorUserId = request.currentUser!.userId;
    const { planSlug } = changePlanSchema.parse(request.body);
    const subscription = await this.service.subscribe(storeId, planSlug, actorUserId);
    return reply.send({ success: true, data: subscription });
  }

  async cancel(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const actorUserId = request.currentUser!.userId;
    const subscription = await this.service.cancel(storeId, actorUserId);
    return reply.send({ success: true, data: subscription });
  }

  async previewChange(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { planSlug } = previewChangeQuerySchema.parse(request.query);
    const preview = await this.service.previewChange(storeId, planSlug);
    return reply.send({ success: true, data: preview });
  }

  async cancelDowngrade(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const actorUserId = request.currentUser!.userId;
    const subscription = await this.service.cancelDowngrade(storeId, actorUserId);
    return reply.send({ success: true, data: subscription });
  }

  async getPayments(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { limit, offset } = paymentsQuerySchema.parse(request.query);
    const { payments, total } = await this.service.getPayments(storeId, limit, offset);
    return reply.send({
      success: true,
      data: payments,
      pagination: { total, limit, offset },
    });
  }

  async adminChangePlan(request: FastifyRequest<{ Params: { storeId: string } }>, reply: FastifyReply) {
    const storeId = parseInt(request.params.storeId, 10);
    if (!Number.isInteger(storeId) || storeId <= 0) {
      throw new ValidationError('Invalid storeId parameter');
    }
    const actorUserId = request.currentUser!.userId;
    const { planSlug } = adminChangePlanSchema.parse(request.body);
    const subscription = await this.service.adminForceChangePlan(storeId, planSlug, actorUserId);
    return reply.send({ success: true, data: subscription });
  }
}
