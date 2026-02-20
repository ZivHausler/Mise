import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProfileService } from './profile.service.js';
import { updateProfileSchema } from '../settings.types.js';

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const profile = await this.profileService.getProfile(userId);
    return reply.send({ success: true, data: profile });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const data = updateProfileSchema.parse(request.body);
    const profile = await this.profileService.updateProfile(userId, data);
    return reply.send({ success: true, data: profile });
  }

  async getOnboarding(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const status = await this.profileService.getOnboardingStatus(userId);
    return reply.send({ success: true, data: status });
  }

  async completeOnboarding(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    await this.profileService.completeOnboarding(userId);
    return reply.send({ success: true });
  }

  async resetOnboarding(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    await this.profileService.resetOnboarding(userId);
    return reply.send({ success: true });
  }
}
