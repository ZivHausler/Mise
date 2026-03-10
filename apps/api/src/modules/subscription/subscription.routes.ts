import type { FastifyInstance } from 'fastify';
import { SubscriptionController } from './subscription.controller.js';
import { SubscriptionService } from './subscription.service.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';
import { CheckoutRepository } from './checkout.repository.js';
import { PayPlusProvider } from './payment-providers/payplus.service.js';
import { PayPalProvider } from './payment-providers/paypal.service.js';
import type { PaymentProvider } from './payment-providers/provider.interface.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { setSubscriptionService } from '../../core/middleware/requireTier.js';
import { StoreRole } from '../stores/store.types.js';
import { ForbiddenError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';
import type { CacheClient } from '../../core/cache/redis.js';
import { startSubscriptionCron } from './subscription.cron.js';
import { env } from '../../config/env.js';

async function requireOwner(request: import('fastify').FastifyRequest, _reply: import('fastify').FastifyReply) {
  const role = request.currentUser?.storeRole;
  const isAdmin = request.currentUser?.isAdmin;
  if (role !== StoreRole.OWNER && !isAdmin) {
    throw new ForbiddenError('Only store owners can manage subscriptions', ErrorCode.FORBIDDEN);
  }
}

export default async function subscriptionRoutes(app: FastifyInstance) {
  const cacheClient = (app as unknown as { container?: { resolve(name: string): unknown } }).container?.resolve('cacheClient') as CacheClient | null ?? null;
  const service = new SubscriptionService(cacheClient);
  const controller = new SubscriptionController(service);

  // Build payment provider map
  const providers = new Map<string, PaymentProvider>();
  if (env.PAYPLUS_API_KEY && env.PAYPLUS_SECRET_KEY) {
    providers.set('payplus', new PayPlusProvider());
  }
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
    providers.set('paypal', new PayPalProvider());
  }

  const checkoutRepo = new CheckoutRepository();
  const paypalProvider = providers.get('paypal') as PayPalProvider | undefined;
  const checkoutService = new CheckoutService(checkoutRepo, providers, cacheClient, paypalProvider);
  const checkoutController = new CheckoutController(checkoutService);

  // Make the subscription service available to the requireTier middleware
  setSubscriptionService(service);

  // Start the subscription cron job (with checkout service for grace period + stale cleanup)
  startSubscriptionCron(service, checkoutService);

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  // Any authenticated user with a store can view subscription and plans
  app.get('/', (req, reply) => controller.getSubscription(req, reply));
  app.get('/plans', (req, reply) => controller.getPlans(req, reply));

  // Preview a plan change (no mutation)
  app.get('/preview-change', { preHandler: [requireOwner] }, (req, reply) => controller.previewChange(req, reply));

  // Payment history
  app.get('/payments', { preHandler: [requireOwner] }, (req, reply) => controller.getPayments(req, reply));

  // Only store owners can change plan, cancel, or cancel a pending downgrade
  app.post('/change', { preHandler: [requireOwner], config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, (req, reply) => controller.changePlan(req, reply));
  app.post('/cancel', { preHandler: [requireOwner], config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, (req, reply) => controller.cancel(req, reply));
  app.post('/cancel-downgrade', { preHandler: [requireOwner], config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, (req, reply) => controller.cancelDowngrade(req, reply));

  // Checkout routes (payment integration)
  app.post('/checkout', { preHandler: [requireOwner], config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, (req, reply) => checkoutController.initiateCheckout(req, reply));
  app.get('/checkout/:id', { preHandler: [requireOwner] }, (req, reply) => checkoutController.getCheckoutStatus(req as import('fastify').FastifyRequest<{ Params: { id: string } }>, reply));
  app.post('/recovery-checkout', { preHandler: [requireOwner], config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, (req, reply) => checkoutController.initiateRenewalRecovery(req, reply));
}

// Exported for use in admin routes
export { SubscriptionService };
