import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

function isEnabled(flagValue: string, storeId: number): boolean {
  if (!flagValue) return false;
  if (flagValue === '*') return true;
  return flagValue.split(',').map((s) => s.trim()).includes(String(storeId));
}

export default async function featuresRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  app.get('/', (request, reply) => {
    const isAdmin = request.currentUser!.isAdmin;
    const storeId = request.currentUser!.storeId!;
    return reply.send({
      success: true,
      data: {
        production: isAdmin || isEnabled(env.FEATURE_PRODUCTION, storeId),
        whatsapp: isAdmin || isEnabled(env.FEATURE_WHATSAPP, storeId),
        sms: isAdmin || isEnabled(env.FEATURE_SMS, storeId),
        ai_chat: isAdmin || isEnabled(env.FEATURE_AI_CHAT, storeId),
      },
    });
  });
}
