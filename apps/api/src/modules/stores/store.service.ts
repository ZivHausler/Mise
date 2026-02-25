import type { FastifyInstance } from 'fastify';
import type { CreateStoreDTO, Store, UserStore, StoreInvitation } from './store.types.js';
import { StoreRole } from './store.types.js';
import { PgStoreRepository } from './store.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { env } from '../../config/env.js';
import { appLogger } from '../../core/logger/logger.js';
import { ErrorCode, Language } from '@mise/shared';
import { sendInviteEmail, buildStoreInviteEmail, buildCreateStoreInviteEmail } from '../notifications/channels/email.js';
import type { AuthTokenPayload } from '../auth/auth.types.js';
import { sendInvitationEmail } from '../notifications/channels/email.js';

export class StoreService {
  constructor(
    private app: FastifyInstance,
  ) {}

  async createStore(userId: number, email: string, data: CreateStoreDTO, inviteToken?: string): Promise<{ store: Store; token: string }> {
    if (!data.name.trim()) {
      throw new ValidationError('Store name is required', ErrorCode.STORE_NAME_REQUIRED);
    }

    if (!inviteToken) {
      throw new ForbiddenError('A create-store invitation is required', ErrorCode.STORE_CREATE_INVITATION_REQUIRED);
    }

    const invitation = await PgStoreRepository.findInvitationByToken(inviteToken);
    if (!invitation || invitation.storeId !== null) {
      throw new ForbiddenError('Invalid or expired create-store invitation', ErrorCode.STORE_CREATE_INVITATION_INVALID);
    }

    const store = await PgStoreRepository.createStore(data);
    await PgStoreRepository.addUserToStore(userId, store.id, StoreRole.OWNER);
    await PgStoreRepository.markInvitationUsed(inviteToken);

    const token = this.generateTokenWithStore(userId, email, store.id, StoreRole.OWNER);

    return { store, token };
  }

  async getMyStores(userId: number): Promise<UserStore[]> {
    return PgStoreRepository.getUserStores(userId);
  }

  async selectStore(userId: number, email: string, storeId: number, isAdmin?: boolean): Promise<{ token: string }> {
    if (isAdmin) {
      const pool = (await import('../../core/database/postgres.js')).getPool();
      const storeResult = await pool.query('SELECT id FROM stores WHERE id = $1', [storeId]);
      if (!storeResult.rows[0]) {
        throw new NotFoundError('Store not found', ErrorCode.STORE_NOT_FOUND);
      }
      const token = this.generateTokenWithStore(userId, email, storeId, StoreRole.ADMIN, true);
      return { token };
    }

    const role = await PgStoreRepository.getUserStoreRole(userId, storeId);
    if (!role) {
      throw new ForbiddenError('You do not belong to this store', ErrorCode.STORE_NO_ACCESS);
    }

    const token = this.generateTokenWithStore(userId, email, storeId, role);
    return { token };
  }

  async getAllStores(): Promise<import('./store.types.js').Store[]> {
    return PgStoreRepository.getAllStores();
  }

  async getStoreMembers(storeId: number): Promise<{ userId: number; email: string; name: string; role: StoreRole }[]> {
    return PgStoreRepository.getStoreMembers(storeId);
  }

  async getPendingInvitations(storeId: number) {
    const invitations = await PgStoreRepository.getPendingInvitations(storeId);
    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      inviteLink: `${env.FRONTEND_URL}/invite/${inv.token}`,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  }

  async revokeInvitation(storeId: number, storeRole: StoreRole, invitationId: number, isAdmin?: boolean): Promise<void> {
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can revoke invitations', ErrorCode.STORE_ONLY_OWNER_CAN_REVOKE);
    }

    const revoked = await PgStoreRepository.revokeInvitation(invitationId, storeId);
    if (!revoked) {
      throw new NotFoundError('Invitation not found or already revoked', ErrorCode.STORE_INVITE_ALREADY_REVOKED);
    }
  }

  async removeMember(storeId: number, storeRole: StoreRole, callerUserId: number, targetUserId: number, isAdmin?: boolean): Promise<void> {
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can remove members', ErrorCode.STORE_ONLY_OWNER_CAN_REMOVE);
    }

    if (callerUserId === targetUserId) {
      throw new ForbiddenError('You cannot remove yourself', ErrorCode.STORE_CANNOT_REMOVE_SELF);
    }

    const targetRole = await PgStoreRepository.getUserStoreRole(targetUserId, storeId);
    if (!targetRole) {
      throw new NotFoundError('User is not a member of this store', ErrorCode.STORE_MEMBER_NOT_FOUND);
    }

    if (targetRole === StoreRole.OWNER) {
      throw new ForbiddenError('Cannot remove a store owner', ErrorCode.STORE_CANNOT_REMOVE_OWNER);
    }

    await PgStoreRepository.removeUserFromStore(targetUserId, storeId);
  }

  async sendInvite(storeId: number, storeRole: StoreRole, email: string, inviteRole: StoreRole, isAdmin?: boolean): Promise<StoreInvitation & { inviteLink: string }> {
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can send invitations', ErrorCode.STORE_ONLY_OWNER_CAN_INVITE);
    }

    const invitation = await PgStoreRepository.createInvitation(storeId, email, inviteRole);

    const inviteLink = `${env.FRONTEND_URL}/invite/${invitation.token}`;
    appLogger.info({ email }, 'Store invite link generated');

    const store = await PgStoreRepository.findStoreById(storeId);
    const storeName = store?.name ?? 'Mise';
    const lang = Language.HEBREW;
    const { subject, html } = buildStoreInviteEmail(storeName, inviteLink, String(inviteRole), invitation.expiresAt, lang);

    sendInviteEmail(email, subject, html)
      .catch((err) => appLogger.error({ err, email }, 'Failed to send store invite email'));

    return { ...invitation, inviteLink };
  }

  async validateInvite(token: string): Promise<{ storeName: string | null; email: string; role: StoreRole; type: 'join_store' | 'create_store' }> {
    const invitation = await PgStoreRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation', ErrorCode.STORE_INVITE_INVALID);
    }

    return {
      storeName: invitation.storeName,
      email: invitation.email,
      role: invitation.role,
      type: invitation.storeId === null ? 'create_store' : 'join_store',
    };
  }

  async acceptInvite(userId: number, token: string): Promise<{ storeId: number; role: StoreRole }> {
    const invitation = await PgStoreRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation', ErrorCode.STORE_INVITE_INVALID);
    }

    if (invitation.storeId === null) {
      throw new ValidationError('Create-store invitations cannot be accepted this way. Use the store setup flow instead.', ErrorCode.STORE_INVITE_WRONG_TYPE);
    }

    await PgStoreRepository.addUserToStore(userId, invitation.storeId, invitation.role);
    await PgStoreRepository.markInvitationUsed(token);

    return { storeId: invitation.storeId, role: invitation.role };
  }

  async createCreateStoreInvitation(email: string): Promise<StoreInvitation & { inviteLink: string }> {
    const invitation = await PgStoreRepository.createCreateStoreInvitation(email);
    const inviteLink = `${env.FRONTEND_URL}/invite/${invitation.token}`;
    appLogger.info({ email }, 'Create-store invite link generated');

    const lang = Language.HEBREW;
    const { subject, html } = buildCreateStoreInviteEmail(inviteLink, invitation.expiresAt, lang);

    sendInviteEmail(email, subject, html)
      .catch((err) => appLogger.error({ err, email }, 'Failed to send create-store invite email'));

    return { ...invitation, inviteLink };
  }

  generateTokenWithStore(userId: number, email: string, storeId: number, storeRole: StoreRole, isAdmin?: boolean): string {
    const payload: AuthTokenPayload = { userId, email, storeId, storeRole, jti: crypto.randomUUID() };
    if (isAdmin) payload['isAdmin'] = true;
    return this.app.jwt.sign(payload, { expiresIn: env.JWT_EXPIRES_IN });
  }

  generateTokenWithoutStore(userId: number, email: string): string {
    return this.app.jwt.sign(
      { userId, email, jti: crypto.randomUUID() },
      { expiresIn: env.JWT_EXPIRES_IN },
    );
  }
}
