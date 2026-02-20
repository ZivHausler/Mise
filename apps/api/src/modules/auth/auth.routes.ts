import type { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { authMiddleware } from '../../core/middleware/auth.js';
import { authRateLimitPlugin } from '../../core/plugins.js';

export default async function authRoutes(app: FastifyInstance) {
  const service = new AuthService(app);
  const controller = new AuthController(service);

  // Apply stricter rate limiting to auth routes (10 requests per 15 min per IP)
  await app.register(authRateLimitPlugin);

  app.post<{ Body: { email: string; password: string; name: string; inviteToken?: string } }>('/register', (req, reply) => controller.register(req, reply));
  app.post<{ Body: { email: string; password: string } }>('/login', (req, reply) => controller.login(req, reply));
  app.post<{ Body: { idToken: string } }>('/google', (req, reply) => controller.googleLogin(req, reply));
  app.post<{ Body: { idToken: string; inviteToken?: string } }>('/google/register', (req, reply) => controller.googleRegister(req, reply));
  app.post<{ Body: { idToken: string; password: string } }>('/google/merge', (req, reply) => controller.mergeGoogleToEmail(req, reply));
  app.post<{ Body: { idToken: string; newPassword: string } }>('/google/merge-password', (req, reply) => controller.mergeEmailToGoogle(req, reply));
  app.get('/me', { preHandler: [authMiddleware] }, (req, reply) => controller.getProfile(req, reply));
  app.post('/refresh', { preHandler: [authMiddleware] }, (req, reply) => controller.refreshToken(req, reply));
  app.post('/logout', { preHandler: [authMiddleware] }, (req, reply) => controller.logout(req, reply));
}
