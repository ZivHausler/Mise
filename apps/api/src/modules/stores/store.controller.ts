import type { FastifyRequest, FastifyReply } from 'fastify';
import type { StoreService } from './store.service.js';
import { StoreRole } from './store.types.js';
import { createStoreSchema, inviteSchema } from './store.schema.js';

export class StoreController {
  constructor(private storeService: StoreService) {}

  async createStore(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const email = request.currentUser!.email;
    const data = createStoreSchema.parse(request.body);
    const result = await this.storeService.createStore(userId, email, data);
    return reply.status(201).send({ success: true, data: result });
  }

  async getMyStores(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const stores = await this.storeService.getMyStores(userId);
    return reply.send({ success: true, data: stores });
  }

  async selectStore(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const email = request.currentUser!.email;
    const { storeId } = request.body as { storeId: string };
    const result = await this.storeService.selectStore(userId, email, storeId);
    return reply.send({ success: true, data: result });
  }

  async getMembers(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    if (!storeId) return reply.status(400).send({ success: false, error: { message: 'No store selected' } });
    const members = await this.storeService.getStoreMembers(storeId);
    return reply.send({ success: true, data: members });
  }

  async sendInvite(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    if (!storeId || !storeRole) return reply.status(400).send({ success: false, error: { message: 'No store selected' } });

    const data = inviteSchema.parse(request.body);
    const invitation = await this.storeService.sendInvite(storeId, storeRole as StoreRole, data.email, data.role as StoreRole);
    return reply.status(201).send({ success: true, data: { token: invitation.token } });
  }

  async validateInvite(request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) {
    const { token } = request.params;
    const result = await this.storeService.validateInvite(token);
    return reply.send({ success: true, data: result });
  }
}
