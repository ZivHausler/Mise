import type { FastifyInstance } from 'fastify';
import { WebhookController } from './webhook.controller.js';
import { CheckoutService } from './checkout.service.js';
import { CheckoutRepository } from './checkout.repository.js';
import { PayPlusProvider } from './payment-providers/payplus.service.js';
import { PayPalProvider } from './payment-providers/paypal.service.js';
import type { PaymentProvider } from './payment-providers/provider.interface.js';
import type { CacheClient } from '../../core/cache/redis.js';
import { env } from '../../config/env.js';

export default async function webhookRoutes(app: FastifyInstance) {
  // Preserve raw body for signature verification
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      (req as any).rawBody = body;
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error);
    }
  });

  // Build provider map — only register providers with configured credentials
  const providers = new Map<string, PaymentProvider>();

  if (env.PAYPLUS_API_KEY && env.PAYPLUS_SECRET_KEY) {
    providers.set('payplus', new PayPlusProvider());
  }

  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
    providers.set('paypal', new PayPalProvider());
  }

  const cacheClient = (app as unknown as { container?: { resolve(name: string): unknown } }).container?.resolve('cacheClient') as CacheClient | null ?? null;
  const checkoutRepo = new CheckoutRepository();
  const paypalProvider = providers.get('paypal') as PayPalProvider | undefined;
  const checkoutService = new CheckoutService(checkoutRepo, providers, cacheClient, paypalProvider);
  const controller = new WebhookController(checkoutService, providers);

  // NO auth middleware — payment providers can't send JWT tokens
  app.post('/payplus', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
  }, (req, reply) => controller.handlePayPlus(req, reply));

  app.post('/paypal', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
  }, (req, reply) => controller.handlePayPal(req, reply));
}
