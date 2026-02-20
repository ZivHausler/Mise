import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  async getRevenue(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = await this.analyticsService.getRevenue(storeId);
    return reply.send({ success: true, data });
  }

  async getPopularRecipes(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = await this.analyticsService.getPopularRecipes(storeId);
    return reply.send({ success: true, data });
  }

  async getOrderStats(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = await this.analyticsService.getOrderStats(storeId);
    return reply.send({ success: true, data });
  }

  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = await this.analyticsService.getDashboard(storeId);
    return reply.send({ success: true, data });
  }

  async getCustomerFrequency(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = await this.analyticsService.getCustomerFrequency(storeId);
    return reply.send({ success: true, data });
  }
}
