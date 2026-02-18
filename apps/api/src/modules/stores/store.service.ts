import type { FastifyInstance } from 'fastify';
import type { CreateStoreDTO, Store, UserStore, StoreInvitation } from './store.types.js';
import { StoreRole } from './store.types.js';
import { PgStoreRepository } from './store.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { env } from '../../config/env.js';

export class StoreService {
  constructor(
    private app: FastifyInstance,
  ) {}

  async createStore(userId: string, email: string, data: CreateStoreDTO): Promise<{ store: Store; token: string }> {
    if (!data.name.trim()) {
      throw new ValidationError('Store name is required');
    }

    const store = await PgStoreRepository.createStore(data);
    await PgStoreRepository.addUserToStore(userId, store.id, StoreRole.OWNER);

    // Generate new JWT with storeId
    const token = this.generateTokenWithStore(userId, email, store.id, StoreRole.OWNER);

    return { store, token };
  }

  async getMyStores(userId: string): Promise<UserStore[]> {
    return PgStoreRepository.getUserStores(userId);
  }

  async selectStore(userId: string, email: string, storeId: string): Promise<{ token: string }> {
    const role = await PgStoreRepository.getUserStoreRole(userId, storeId);
    if (!role) {
      throw new ForbiddenError('You do not belong to this store');
    }

    const token = this.generateTokenWithStore(userId, email, storeId, role);
    return { token };
  }

  async getStoreMembers(storeId: string): Promise<{ userId: string; email: string; name: string; role: StoreRole }[]> {
    return PgStoreRepository.getStoreMembers(storeId);
  }

  async sendInvite(storeId: string, storeRole: StoreRole, email: string, inviteRole: StoreRole): Promise<StoreInvitation & { inviteLink: string }> {
    if (storeRole !== StoreRole.OWNER) {
      throw new ForbiddenError('Only store owners can send invitations');
    }

    const invitation = await PgStoreRepository.createInvitation(storeId, email, inviteRole);

    const inviteLink = `${env.FRONTEND_URL ?? 'http://localhost:5173'}/invite/${invitation.token}`;
    console.log(`\n📧 INVITE LINK for ${email}: ${inviteLink}\n`);

    return { ...invitation, inviteLink };
  }

  async validateInvite(token: string): Promise<{ storeName: string; email: string; role: StoreRole }> {
    const invitation = await PgStoreRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation');
    }

    return {
      storeName: invitation.storeName,
      email: invitation.email,
      role: invitation.role,
    };
  }

  async acceptInvite(userId: string, token: string): Promise<{ storeId: string; role: StoreRole }> {
    const invitation = await PgStoreRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation');
    }

    await PgStoreRepository.addUserToStore(userId, invitation.storeId, invitation.role);
    await PgStoreRepository.markInvitationUsed(token);

    return { storeId: invitation.storeId, role: invitation.role };
  }

  generateTokenWithStore(userId: string, email: string, storeId: string, storeRole: StoreRole): string {
    return this.app.jwt.sign(
      { userId, email, storeId, storeRole },
      { expiresIn: env.JWT_EXPIRES_IN },
    );
  }

  generateTokenWithoutStore(userId: string, email: string): string {
    return this.app.jwt.sign(
      { userId, email },
      { expiresIn: env.JWT_EXPIRES_IN },
    );
  }
}
