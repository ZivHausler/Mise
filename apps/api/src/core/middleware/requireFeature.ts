import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import { ForbiddenError } from '../errors/app-error.js';
import { ErrorCode } from '@mise/shared';

type FeatureFlag = 'production' | 'whatsapp' | 'sms' | 'ai_chat' | 'loyalty_enhancements';

const featureFlagEnvMap: Record<FeatureFlag, string> = {
  production: env.FEATURE_PRODUCTION,
  whatsapp: env.FEATURE_WHATSAPP,
  sms: env.FEATURE_SMS,
  ai_chat: env.FEATURE_AI_CHAT,
  loyalty_enhancements: env.FEATURE_LOYALTY_ENHANCEMENTS,
};

export function isFeatureEnabled(flag: FeatureFlag, storeId: number): boolean {
  return isEnabled(featureFlagEnvMap[flag], storeId);
}

function isEnabled(flagValue: string, storeId: number): boolean {
  if (!flagValue) return false;
  if (flagValue === '*') return true;
  return flagValue.split(',').map((s) => s.trim()).includes(String(storeId));
}

export function requireFeature(flag: FeatureFlag) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.currentUser?.isAdmin) return;
    const storeId = request.currentUser?.storeId;
    if (!storeId || !isEnabled(featureFlagEnvMap[flag], storeId)) {
      throw new ForbiddenError('This feature is not available for your store', ErrorCode.FEATURE_DISABLED);
    }
  };
}
