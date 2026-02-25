import type { FastifyInstance } from 'fastify';
import { PgAdminRepository } from './admin.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import type { AdminUser, AdminStore, AdminInvitation, AdminAuditEntry, AdminAnalytics } from './admin.types.js';
import type { PaginatedResult } from '../../core/types/pagination.js';
import { sendInvitationEmail } from '../notifications/channels/email.js';
import { env } from '../../config/env.js';
import { appLogger } from '../../core/logger/logger.js';
import { ErrorCode } from '@mise/shared';

export class AdminService {
  constructor(private app: FastifyInstance) {}

  async getUsers(page: number, limit: number, search?: string, includeAdmins = false): Promise<PaginatedResult<AdminUser>> {
    return PgAdminRepository.getUsers(page, limit, search, includeAdmins);
  }

  async toggleAdmin(currentUserId: number, targetUserId: number, isAdmin: boolean): Promise<void> {
    if (currentUserId === targetUserId) {
      throw new ForbiddenError('Cannot change your own admin status', ErrorCode.ADMIN_CANNOT_CHANGE_OWN_STATUS);
    }
    const user = await PgAdminRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
    if (user.isAdmin) {
      throw new ForbiddenError('Cannot modify admin status of another admin', ErrorCode.ADMIN_CANNOT_MODIFY_ADMIN);
    }
    await PgAdminRepository.toggleAdmin(targetUserId, isAdmin);
  }

  async toggleDisabled(currentUserId: number, targetUserId: number, disabled: boolean): Promise<void> {
    if (currentUserId === targetUserId) {
      throw new ForbiddenError('Cannot disable your own account', ErrorCode.ADMIN_CANNOT_DISABLE_SELF);
    }
    const user = await PgAdminRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
    if (user.isAdmin) {
      throw new ForbiddenError('Cannot disable another admin', ErrorCode.ADMIN_CANNOT_DISABLE_ADMIN);
    }
    await PgAdminRepository.toggleDisabled(targetUserId, disabled);
  }

  async deleteUser(currentUserId: number, targetUserId: number): Promise<void> {
    if (currentUserId === targetUserId) {
      throw new ForbiddenError('Cannot delete your own account', ErrorCode.ADMIN_CANNOT_DELETE_SELF);
    }
    const user = await PgAdminRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
    if (user.isAdmin) {
      throw new ForbiddenError('Cannot delete an admin user', ErrorCode.ADMIN_CANNOT_DELETE_ADMIN);
    }
    await PgAdminRepository.deleteUser(targetUserId);
  }

  async deleteStore(storeId: number): Promise<void> {
    const pool = (await import('../../core/database/postgres.js')).getPool();
    const result = await pool.query('SELECT id FROM stores WHERE id = $1', [storeId]);
    if (!result.rows[0]) throw new NotFoundError('Store not found', ErrorCode.STORE_NOT_FOUND);
    await PgAdminRepository.deleteStore(storeId);
  }

  async getStores(page: number, limit: number, search?: string): Promise<PaginatedResult<AdminStore>> {
    return PgAdminRepository.getStores(page, limit, search);
  }

  async getStoreMembers(storeId: number) {
    return PgAdminRepository.getStoreMembers(storeId);
  }

  async updateStore(storeId: number, data: { name?: string; address?: string }): Promise<void> {
    if (!data.name && !data.address) {
      throw new ValidationError('At least one field must be provided', ErrorCode.ADMIN_FIELD_REQUIRED);
    }
    await PgAdminRepository.updateStore(storeId, data);
  }

  async getInvitations(
    page: number,
    limit: number,
    filters: { status?: string; search?: string; storeId?: number; userId?: number; email?: string; role?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PaginatedResult<AdminInvitation>> {
    if (filters.status && !['pending', 'used', 'expired', 'revoked'].includes(filters.status)) {
      throw new ValidationError('Invalid status filter', ErrorCode.ADMIN_INVALID_STATUS_FILTER);
    }
    return PgAdminRepository.getInvitations(page, limit, filters);
  }

  async getDistinctInvitationEmails(): Promise<string[]> {
    return PgAdminRepository.getDistinctInvitationEmails();
  }

  async createStoreInvitation(email: string): Promise<AdminInvitation> {
    if (!email || !email.includes('@')) {
      throw new ValidationError('Valid email is required', ErrorCode.ADMIN_EMAIL_REQUIRED);
    }
    const invitation = await PgAdminRepository.createCreateStoreInvitation(email);

    const inviteLink = `${env.FRONTEND_URL}/invite/${invitation.token}`;
    sendInvitationEmail({
      to: email,
      type: 'store_invite',
      inviteLink,
    }).catch((err) => appLogger.error({ err, email }, '[INVITE] Failed to send store invite email'));

    return invitation;
  }

  async revokeInvitation(invitationId: number): Promise<void> {
    const invitation = await PgAdminRepository.findInvitationById(invitationId);
    if (!invitation) throw new NotFoundError('Invitation not found', ErrorCode.ADMIN_INVITE_NOT_FOUND);
    if (invitation.usedAt) throw new ValidationError('Cannot revoke a used invitation', ErrorCode.ADMIN_INVITE_USED);
    if (invitation.revokedAt) throw new ValidationError('Invitation already revoked', ErrorCode.ADMIN_INVITE_ALREADY_REVOKED);
    await PgAdminRepository.revokeInvitation(invitationId);
  }

  async getAuditLog(
    page: number,
    limit: number,
    filters: { userId?: number; method?: string; statusCode?: string; dateFrom?: string; dateTo?: string; search?: string; since?: string; excludeIds?: string[] },
  ): Promise<PaginatedResult<AdminAuditEntry>> {
    return PgAdminRepository.getAuditLog(page, limit, filters);
  }

  async getAuditLogRequestBody(auditLogId: number): Promise<unknown | null> {
    return PgAdminRepository.getAuditLogRequestBody(auditLogId);
  }

  async getAuditLogResponseBody(auditLogId: number): Promise<unknown | null> {
    return PgAdminRepository.getAuditLogResponseBody(auditLogId);
  }

  async cleanupTestUsers(emailPattern: string): Promise<number> {
    return PgAdminRepository.cleanupTestUsers(emailPattern);
  }

  async getAnalytics(range: string): Promise<AdminAnalytics> {
    const now = new Date();
    let dateFrom: Date;

    switch (range) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return PgAdminRepository.getAnalytics(dateFrom);
  }
}
