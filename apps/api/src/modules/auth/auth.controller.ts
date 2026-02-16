import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from './auth.service.js';
import { registerSchema, loginSchema } from '@mise/shared/src/validation/index.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(
    request: FastifyRequest<{ Body: { email: string; password: string; name: string } }>,
    reply: FastifyReply,
  ) {
    const parsed = registerSchema.parse(request.body);
    const result = await this.authService.register(parsed);
    return reply.status(201).send({ success: true, data: result });
  }

  async login(
    request: FastifyRequest<{ Body: { email: string; password: string } }>,
    reply: FastifyReply,
  ) {
    const parsed = loginSchema.parse(request.body);
    const result = await this.authService.login(parsed);
    return reply.send({ success: true, data: result });
  }

  async googleLogin(
    request: FastifyRequest<{ Body: { idToken: string } }>,
    reply: FastifyReply,
  ) {
    const { idToken } = request.body;
    const result = await this.authService.googleLogin(idToken);
    return reply.send({ success: true, data: result });
  }

  async mergeGoogleToEmail(
    request: FastifyRequest<{ Body: { idToken: string; password: string } }>,
    reply: FastifyReply,
  ) {
    const { idToken, password } = request.body;
    const result = await this.authService.mergeGoogleToEmail(idToken, password);
    return reply.send({ success: true, data: result });
  }

  async mergeEmailToGoogle(
    request: FastifyRequest<{ Body: { idToken: string; newPassword: string } }>,
    reply: FastifyReply,
  ) {
    const { idToken, newPassword } = request.body;
    const result = await this.authService.mergeEmailToGoogle(idToken, newPassword);
    return reply.send({ success: true, data: result });
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const result = await this.authService.getProfile(userId);
    return reply.send({ success: true, data: result });
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const result = await this.authService.refreshToken(userId);
    return reply.send({ success: true, data: result });
  }
}
