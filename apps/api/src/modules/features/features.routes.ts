import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

function isEnabled(flagValue: string, storeId: string): boolean {
  if (!flagValue) return false;
  if (flagValue === '*') return true;
  return flagValue.split(',').map((s) => s.trim()).includes(storeId);
}

export default async function featuresRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get('/', (request, reply) => {
    const storeId = request.currentUser!.storeId!;
    return reply.send({
      success: true,
      data: {
        production: isEnabled(env.FEATURE_PRODUCTION, storeId),
      },
    });
  });
}
