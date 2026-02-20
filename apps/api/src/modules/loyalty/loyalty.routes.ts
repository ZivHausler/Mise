import type { FastifyInstance } from 'fastify';
import { LoyaltyController } from './loyalty.controller.js';
import { LoyaltyService } from './loyalty.service.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';

export default async function loyaltyRoutes(app: FastifyInstance) {
  const service = new LoyaltyService();
  const controller = new LoyaltyController(service);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  // Event subscriptions
  const eventBus = getEventBus();

  eventBus.subscribe(EventNames.PAYMENT_RECEIVED, async (event) => {
    try {
      const { paymentId, orderId, amount } = event.payload as { paymentId: string; orderId: string; amount: number };
      await service.awardPointsForPayment(paymentId, orderId, amount);
    } catch (err) {
      app.log.error({ err, event }, 'Failed to award loyalty points');
    }
  });

  eventBus.subscribe(EventNames.PAYMENT_REFUNDED, async (event) => {
    try {
      const { paymentId, orderId, amount } = event.payload as { paymentId: string; orderId: string; amount: number };
      await service.deductPointsForRefund(paymentId, orderId, amount);
    } catch (err) {
      app.log.error({ err, event }, 'Failed to deduct loyalty points');
    }
  });

  // HTTP routes
  app.get<{ Params: { customerId: string } }>('/customer/:customerId', (req, reply) => controller.getCustomerBalance(req, reply));
  app.get<{ Params: { customerId: string }; Querystring: { page?: string; limit?: string } }>('/customer/:customerId/transactions', (req, reply) => controller.getCustomerTransactions(req, reply));
  app.post('/adjust', (req, reply) => controller.adjustPoints(req, reply));
  app.post('/redeem', (req, reply) => controller.redeemPoints(req, reply));
}
