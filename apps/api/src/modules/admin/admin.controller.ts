import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AdminService } from './admin.service.js';

export class AdminController {
  constructor(private service: AdminService) {}

  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    const { page = '1', limit = '20', search, includeAdmins } = request.query as Record<string, string>;
    const result = await this.service.getUsers(parseInt(page, 10), parseInt(limit, 10), search, includeAdmins === 'true');
    return reply.send({ success: true, data: result });
  }

  async toggleAdmin(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { isAdmin } = request.body as { isAdmin: boolean };
    await this.service.toggleAdmin(request.currentUser!.userId, id, isAdmin);
    return reply.send({ success: true });
  }

  async toggleDisabled(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { disabled } = request.body as { disabled: boolean };
    await this.service.toggleDisabled(request.currentUser!.userId, id, disabled);
    return reply.send({ success: true });
  }

  async getStores(request: FastifyRequest, reply: FastifyReply) {
    const { page = '1', limit = '20', search } = request.query as Record<string, string>;
    const result = await this.service.getStores(parseInt(page, 10), parseInt(limit, 10), search);
    return reply.send({ success: true, data: result });
  }

  async getStoreMembers(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const members = await this.service.getStoreMembers(id);
    return reply.send({ success: true, data: members });
  }

  async updateStore(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; address?: string };
    await this.service.updateStore(id, body);
    return reply.send({ success: true });
  }

  async getInvitations(request: FastifyRequest, reply: FastifyReply) {
    const { page = '1', limit = '20', status, search, storeId, userId, role, dateFrom, dateTo } = request.query as Record<string, string>;
    const result = await this.service.getInvitations(parseInt(page, 10), parseInt(limit, 10), {
      status,
      search,
      storeId,
      userId,
      role,
      dateFrom,
      dateTo,
    });
    return reply.send({ success: true, data: result });
  }

  async createStoreInvitation(request: FastifyRequest, reply: FastifyReply) {
    const { email } = request.body as { email: string };
    const invitation = await this.service.createStoreInvitation(email);
    return reply.status(201).send({ success: true, data: invitation });
  }

  async revokeInvitation(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await this.service.revokeInvitation(id);
    return reply.send({ success: true });
  }

  async getAuditLog(request: FastifyRequest, reply: FastifyReply) {
    const { page = '1', limit = '20', userId, method, statusCode, dateFrom, dateTo, search, since, excludeIds } = request.query as Record<string, string>;
    const result = await this.service.getAuditLog(parseInt(page, 10), parseInt(limit, 10), {
      userId,
      method,
      statusCode,
      dateFrom,
      dateTo,
      search,
      since,
      excludeIds: excludeIds ? excludeIds.split(',') : undefined,
    });
    return reply.send({ success: true, data: result });
  }

  async getAuditLogRequestBody(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = await this.service.getAuditLogRequestBody(id);
    return reply.send({ success: true, data: body });
  }

  async getAuditLogResponseBody(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = await this.service.getAuditLogResponseBody(id);
    return reply.send({ success: true, data: body });
  }

  async getAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const { range = 'month' } = request.query as { range?: string };
    const analytics = await this.service.getAnalytics(range);
    return reply.send({ success: true, data: analytics });
  }
}
