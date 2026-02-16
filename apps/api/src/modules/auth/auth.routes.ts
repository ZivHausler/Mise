import type { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PgAuthRepository } from './auth.repository.js';
import { authMiddleware } from '../../core/middleware/auth.js';
import { authRateLimitPlugin } from '../../core/plugins.js';

export default async function authRoutes(app: FastifyInstance) {
  const repository = new PgAuthRepository();
  const service = new AuthService(repository, app);
  const controller = new AuthController(service);

  // Apply stricter rate limiting to auth routes (10 requests per 15 min per IP)
  await app.register(authRateLimitPlugin);

  app.post('/register', (req, reply) => controller.register(req as any, reply));
  app.post('/login', (req, reply) => controller.login(req as any, reply));
  app.post('/google', (req, reply) => controller.googleLogin(req as any, reply));
  app.post('/google/merge', (req, reply) => controller.mergeGoogleToEmail(req as any, reply));
  app.post('/google/merge-password', (req, reply) => controller.mergeEmailToGoogle(req as any, reply));
  app.get('/me', { preHandler: [authMiddleware] }, (req, reply) => controller.getProfile(req, reply));
  app.post('/refresh', { preHandler: [authMiddleware] }, (req, reply) => controller.refreshToken(req, reply));
}
