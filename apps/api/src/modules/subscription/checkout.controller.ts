import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CheckoutService } from './checkout.service.js';
import { initiateCheckoutSchema, checkoutStatusParamsSchema, trialDowngradeSchema } from './checkout.schema.js';

export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  async initiateCheckout(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const actorUserId = request.currentUser!.userId;
    const { planSlug } = initiateCheckoutSchema.parse(request.body);

    const result = await this.checkoutService.initiateCheckout({
      storeId,
      planSlug,
      actorUserId,
    });

    return reply.send({ success: true, data: result });
  }

  async getCheckoutStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = checkoutStatusParamsSchema.parse(request.params);

    const result = await this.checkoutService.getCheckoutStatus(id, storeId);
    return reply.send({ success: true, data: result });
  }

  async initiateRenewalRecovery(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const actorUserId = request.currentUser!.userId;

    const result = await this.checkoutService.initiateRenewalRecovery({
      storeId,
      actorUserId,
    });

    return reply.send({ success: true, data: result });
  }

  async handleTrialDowngrade(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const actorUserId = request.currentUser!.userId;
    const { planSlug } = trialDowngradeSchema.parse(request.body);

    const subscription = await this.checkoutService.handleTrialDowngrade({
      storeId,
      targetPlanSlug: planSlug,
      actorUserId,
    });

    return reply.send({ success: true, data: subscription });
  }
}
