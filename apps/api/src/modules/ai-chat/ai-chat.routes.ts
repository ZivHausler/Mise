import type { FastifyInstance } from 'fastify';
import { AiChatController } from './ai-chat.controller.js';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';
import { requireFeature } from '../../core/middleware/requireFeature.js';

export default async function aiChatRoutes(app: FastifyInstance) {
  const controller = new AiChatController();

  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);
  app.addHook('preHandler', requireFeature('ai_chat'));

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
