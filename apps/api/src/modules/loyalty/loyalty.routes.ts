import type { FastifyInstance } from 'fastify';
import { LoyaltyController } from './loyalty.controller.js';
import { LoyaltyService } from './loyalty.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { requireTier, isTierFeatureEnabled } from '../../core/middleware/requireTier.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';

export default async function loyaltyRoutes(app: FastifyInstance) {
  const service = new LoyaltyService();
  const controller = new LoyaltyController(service);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  // Event subscriptions — only process if loyalty is enabled for the store
  const eventBus = getEventBus();

  eventBus.subscribe(EventNames.PAYMENT_RECEIVED, async (event) => {
    try {
      const { paymentId, orderId, amount, storeId } = event.payload as { paymentId: number; orderId: number; amount: number; storeId: number };
      if (!(await isTierFeatureEnabled('loyalty', storeId))) return;
      await service.awardPointsForPayment(paymentId, orderId, amount);
    } catch (err) {
      app.log.error({ err, event }, 'Failed to award loyalty points');
    }
  });

  eventBus.subscribe(EventNames.PAYMENT_REFUNDED, async (event) => {
    try {
      const { paymentId, orderId, amount, storeId } = event.payload as { paymentId: number; orderId: number; amount: number; storeId: number };
      if (!(await isTierFeatureEnabled('loyalty', storeId))) return;
      await service.deductPointsForRefund(paymentId, orderId, amount);
    } catch (err) {
      app.log.error({ err, event }, 'Failed to deduct loyalty points');
    }
  });

  // HTTP routes — all gated behind loyalty feature flag
  app.get('/dashboard', { preHandler: [requireTier('loyalty'), requireTier('loyalty_enhancements')] }, (req, reply) => controller.getDashboard(req, reply));
  app.get<{ Params: { customerId: string } }>('/customer/:customerId', { preHandler: [requireTier('loyalty')] }, (req, reply) => controller.getCustomerBalance(req, reply));
  app.get<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string } }>('/customer/:customerId/transactions', { preHandler: [requireTier('loyalty')] }, (req, reply) => controller.getCustomerTransactions(req, reply));
  app.post('/adjust', { preHandler: [requireTier('loyalty')] }, (req, reply) => controller.adjustPoints(req, reply));
  app.post('/redeem', { preHandler: [requireTier('loyalty')] }, (req, reply) => controller.redeemPoints(req, reply));
}
