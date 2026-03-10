import type { FastifyInstance } from 'fastify';
import { AiChatController } from './ai-chat.controller.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { requireTier } from '../../core/middleware/requireTier.js';

export default async function aiChatRoutes(app: FastifyInstance) {
  const controller = new AiChatController();

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);
  app.addHook('preHandler', requireTier('ai_chat'));

  app.post('/stream', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, (req, reply) => controller.stream(req, reply));
  app.post('/message', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, (req, reply) => controller.message(req, reply));
}
