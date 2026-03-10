import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../errors/app-error.js';
import { ErrorCode } from '@mise/shared';
import type { SubscriptionService } from '../../modules/subscription/subscription.service.js';

// Singleton instance, set during server bootstrap (from subscription routes)
let subscriptionService: SubscriptionService;

export function setSubscriptionService(svc: SubscriptionService) {
  subscriptionService = svc;
}

export function getSubscriptionService(): SubscriptionService {
  return subscriptionService;
}

export function requireTier(feature: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const storeId = request.currentUser?.storeId;
    if (!storeId) {
      throw new ForbiddenError('Store context required', ErrorCode.FEATURE_DISABLED);
    }
    const features = await subscriptionService.getStoreFeatures(storeId);
    if (!features.includes(feature)) {
      throw new ForbiddenError('This feature is not available on your current plan', ErrorCode.FEATURE_DISABLED);
    }
  };
}

// For direct checks in code (replaces isFeatureEnabled)
export async function isTierFeatureEnabled(feature: string, storeId: number): Promise<boolean> {
  const features = await subscriptionService.getStoreFeatures(storeId);
  return features.includes(feature);
}
