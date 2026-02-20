import type { FastifyRequest, FastifyReply } from 'fastify';
import type { StoreService } from './store.service.js';
import { StoreRole } from './store.types.js';
import { createStoreSchema, inviteSchema } from './store.schema.js';
import { ValidationError } from '../../core/errors/app-error.js';

export class StoreController {
  constructor(private storeService: StoreService) {}

  async createStore(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const email = request.currentUser!.email;
    const { inviteToken, ...storeData } = request.body as Record<string, unknown>;
    const data = createStoreSchema.parse(storeData);
    const result = await this.storeService.createStore(userId, email, data, inviteToken as string | undefined);
    return reply.status(201).send({ success: true, data: result });
  }

  async adminCreateStoreInvite(request: FastifyRequest, reply: FastifyReply) {
    const { email } = request.body as { email: string };
    if (!email) throw new ValidationError('Email is required');
    const result = await this.storeService.createCreateStoreInvitation(email);
    return reply.status(201).send({ success: true, data: { token: result.token, inviteLink: result.inviteLink } });
  }

  async getMyStores(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const stores = await this.storeService.getMyStores(userId);
    return reply.send({ success: true, data: stores });
  }

  async selectStore(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const email = request.currentUser!.email;
    const isAdmin = request.currentUser!.isAdmin;
    const { storeId } = request.body as { storeId: string };
    const result = await this.storeService.selectStore(userId, email, storeId, isAdmin);
    return reply.send({ success: true, data: result });
  }

  async getAllStores(request: FastifyRequest, reply: FastifyReply) {
    const stores = await this.storeService.getAllStores();
    return reply.send({ success: true, data: stores });
  }

  async getMembers(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const members = await this.storeService.getStoreMembers(storeId);
    return reply.send({ success: true, data: members });
  }

  async getPendingInvitations(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const invitations = await this.storeService.getPendingInvitations(storeId);
    return reply.send({ success: true, data: invitations });
  }

  async sendInvite(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    if (!storeRole) throw new ValidationError('No store role assigned');

    const data = inviteSchema.parse(request.body);
    const isAdmin = request.currentUser!.isAdmin;
    const invitation = await this.storeService.sendInvite(storeId, storeRole as StoreRole, data.email, data.role as StoreRole, isAdmin);
    return reply.status(201).send({ success: true, data: { token: invitation.token, inviteLink: invitation.inviteLink } });
  }

  async validateInvite(request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) {
    const { token } = request.params;
    const result = await this.storeService.validateInvite(token);
    return reply.send({ success: true, data: result });
  }

  async acceptInvite(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const email = request.currentUser!.email;
    const { token } = request.body as { token: string };

    const { storeId, role } = await this.storeService.acceptInvite(userId, token);
    const jwt = this.storeService.generateTokenWithStore(userId, email, storeId, role);

    return reply.send({ success: true, data: { token: jwt, storeId, role } });
  }
}
