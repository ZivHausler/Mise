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

  async createStore(userId: string, email: string, data: CreateStoreDTO, inviteToken?: string): Promise<{ store: Store; token: string }> {
    if (!data.name.trim()) {
      throw new ValidationError('Store name is required');
    }

    // Require a create-store invitation token
    if (!inviteToken) {
      throw new ForbiddenError('A create-store invitation is required');
    }

    const invitation = await PgStoreRepository.findInvitationByToken(inviteToken);
    if (!invitation || invitation.storeId !== null) {
      throw new ForbiddenError('Invalid or expired create-store invitation');
    }

    const store = await PgStoreRepository.createStore(data);
    await PgStoreRepository.addUserToStore(userId, store.id, StoreRole.OWNER);
    await PgStoreRepository.markInvitationUsed(inviteToken);

    // Generate new JWT with storeId
    const token = this.generateTokenWithStore(userId, email, store.id, StoreRole.OWNER);

    return { store, token };
  }

  async getMyStores(userId: string): Promise<UserStore[]> {
    return PgStoreRepository.getUserStores(userId);
  }

  async selectStore(userId: string, email: string, storeId: string, isAdmin?: boolean): Promise<{ token: string }> {
    if (isAdmin) {
      // Admins can select any store — verify store exists
      const pool = (await import('../../core/database/postgres.js')).getPool();
      const storeResult = await pool.query('SELECT id FROM stores WHERE id = $1', [storeId]);
      if (!storeResult.rows[0]) {
        throw new NotFoundError('Store not found');
      }
      const token = this.generateTokenWithStore(userId, email, storeId, StoreRole.ADMIN, true);
      return { token };
    }

    const role = await PgStoreRepository.getUserStoreRole(userId, storeId);
    if (!role) {
      throw new ForbiddenError('You do not belong to this store');
    }

    const token = this.generateTokenWithStore(userId, email, storeId, role);
    return { token };
  }

  async getAllStores(): Promise<import('./store.types.js').Store[]> {
    return PgStoreRepository.getAllStores();
  }

  async getStoreMembers(storeId: string): Promise<{ userId: string; email: string; name: string; role: StoreRole }[]> {
    return PgStoreRepository.getStoreMembers(storeId);
  }

  async getPendingInvitations(storeId: string) {
    const invitations = await PgStoreRepository.getPendingInvitations(storeId);
    return invitations.map((inv) => ({
      email: inv.email,
      role: inv.role,
      inviteLink: `${env.FRONTEND_URL ?? 'http://localhost:5173'}/invite/${inv.token}`,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  }

  async sendInvite(storeId: string, storeRole: StoreRole, email: string, inviteRole: StoreRole, isAdmin?: boolean): Promise<StoreInvitation & { inviteLink: string }> {
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can send invitations');
    }

    const invitation = await PgStoreRepository.createInvitation(storeId, email, inviteRole);

    const inviteLink = `${env.FRONTEND_URL ?? 'http://localhost:5173'}/invite/${invitation.token}`;
    console.log(`\n📧 INVITE LINK for ${email}: ${inviteLink}\n`);

    return { ...invitation, inviteLink };
  }

  async validateInvite(token: string): Promise<{ storeName: string | null; email: string; role: StoreRole; type: 'join_store' | 'create_store' }> {
    const invitation = await PgStoreRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation');
    }

    return {
      storeName: invitation.storeName,
      email: invitation.email,
      role: invitation.role,
      type: invitation.storeId === null ? 'create_store' : 'join_store',
    };
  }

  async acceptInvite(userId: string, token: string): Promise<{ storeId: string; role: StoreRole }> {
    const invitation = await PgStoreRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation');
    }

    if (invitation.storeId === null) {
      throw new ValidationError('Create-store invitations cannot be accepted this way. Use the store setup flow instead.');
    }

    await PgStoreRepository.addUserToStore(userId, invitation.storeId, invitation.role);
    await PgStoreRepository.markInvitationUsed(token);

    return { storeId: invitation.storeId, role: invitation.role };
  }

  async createCreateStoreInvitation(email: string): Promise<StoreInvitation & { inviteLink: string }> {
    const invitation = await PgStoreRepository.createCreateStoreInvitation(email);
    const inviteLink = `${env.FRONTEND_URL ?? 'http://localhost:5173'}/invite/${invitation.token}`;
    console.log(`\n📧 CREATE-STORE INVITE LINK for ${email}: ${inviteLink}\n`);
    return { ...invitation, inviteLink };
  }

  generateTokenWithStore(userId: string, email: string, storeId: string, storeRole: StoreRole, isAdmin?: boolean): string {
    const payload: Record<string, unknown> = { userId, email, storeId, storeRole };
    if (isAdmin) payload.isAdmin = true;
    return this.app.jwt.sign(payload, { expiresIn: env.JWT_EXPIRES_IN });
  }

  generateTokenWithoutStore(userId: string, email: string): string {
    return this.app.jwt.sign(
      { userId, email },
      { expiresIn: env.JWT_EXPIRES_IN },
    );
  }
}
