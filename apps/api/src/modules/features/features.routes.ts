import type { FastifyInstance } from 'fastify';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { getSubscriptionService } from '../../core/middleware/requireTier.js';
import { env } from '../../config/env.js';

// Features gated by env var — not ready for production yet.
// When env flag is false, the feature shows as "coming soon" regardless of tier.
const FEATURE_ENV_GATES: Record<string, keyof typeof env> = {
  production: 'FEATURE_PRODUCTION',
  receipt_scanner: 'FEATURE_RECEIPT_SCANNER',
  whatsapp: 'FEATURE_WHATSAPP',
};

export default async function featuresRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  const subscriptionService = getSubscriptionService();

  app.get('/', async (request, reply) => {
    const storeId = request.currentUser!.storeId!;
    const features = await subscriptionService.getStoreFeatures(storeId);

    // Collect features that are "coming soon" (env flag off)
    const comingSoon: string[] = [];
    for (const [feature, envKey] of Object.entries(FEATURE_ENV_GATES)) {
      if (!env[envKey]) {
        comingSoon.push(feature);
      }
    }

    return reply.send({
      success: true,
      data: {
        dashboard: features.includes('dashboard'),
        customers: features.includes('customers'),
        orders: features.includes('orders'),
        payments: features.includes('payments'),
        invoices: features.includes('invoices'),
        notifications: features.includes('notifications'),
        production: features.includes('production') && !comingSoon.includes('production'),
        whatsapp: features.includes('whatsapp') && !comingSoon.includes('whatsapp'),
        sms: features.includes('sms'),
        ai_chat: features.includes('ai_chat'),
        loyalty: features.includes('loyalty'),
        loyaltyEnhancements: features.includes('loyalty_enhancements'),
        receiptScanner: features.includes('receipt_scanner') && !comingSoon.includes('receipt_scanner'),
        comingSoon,
      },
    });
  });
}
