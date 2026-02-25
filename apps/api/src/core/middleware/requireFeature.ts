import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import { ForbiddenError } from '../errors/app-error.js';
import { ErrorCode } from '@mise/shared';

type FeatureFlag = 'production';

const featureFlagEnvMap: Record<FeatureFlag, string> = {
  production: env.FEATURE_PRODUCTION,
};

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
