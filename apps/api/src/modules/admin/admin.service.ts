import type { FastifyInstance } from 'fastify';
import { PgAdminRepository } from './admin.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import type { PaginatedResult, AdminUser, AdminStore, AdminInvitation, AdminAuditEntry, AdminAnalytics } from './admin.types.js';

export class AdminService {
  constructor(private app: FastifyInstance) {}

  async getUsers(page: number, limit: number, search?: string): Promise<PaginatedResult<AdminUser>> {
    return PgAdminRepository.getUsers(page, limit, search);
  }

  async toggleAdmin(currentUserId: string, targetUserId: string, isAdmin: boolean): Promise<void> {
    if (currentUserId === targetUserId) {
      throw new ForbiddenError('Cannot change your own admin status');
    }
    const user = await PgAdminRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundError('User not found');
    await PgAdminRepository.toggleAdmin(targetUserId, isAdmin);
  }

  async toggleDisabled(currentUserId: string, targetUserId: string, disabled: boolean): Promise<void> {
    if (currentUserId === targetUserId) {
      throw new ForbiddenError('Cannot disable your own account');
    }
    const user = await PgAdminRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundError('User not found');
    await PgAdminRepository.toggleDisabled(targetUserId, disabled);
  }

  async getStores(page: number, limit: number, search?: string): Promise<PaginatedResult<AdminStore>> {
    return PgAdminRepository.getStores(page, limit, search);
  }

  async getStoreMembers(storeId: string) {
    return PgAdminRepository.getStoreMembers(storeId);
  }

  async updateStore(storeId: string, data: { name?: string; address?: string }): Promise<void> {
    if (!data.name && !data.address) {
      throw new ValidationError('At least one field must be provided');
    }
    await PgAdminRepository.updateStore(storeId, data);
  }

  async getInvitations(page: number, limit: number, status?: string): Promise<PaginatedResult<AdminInvitation>> {
    if (status && !['pending', 'used', 'expired', 'revoked'].includes(status)) {
      throw new ValidationError('Invalid status filter');
    }
    return PgAdminRepository.getInvitations(page, limit, status);
  }

  async createStoreInvitation(email: string): Promise<AdminInvitation> {
    if (!email || !email.includes('@')) {
      throw new ValidationError('Valid email is required');
    }
    return PgAdminRepository.createCreateStoreInvitation(email);
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    const invitation = await PgAdminRepository.findInvitationById(invitationId);
    if (!invitation) throw new NotFoundError('Invitation not found');
    if (invitation.usedAt) throw new ValidationError('Cannot revoke a used invitation');
    if (invitation.revokedAt) throw new ValidationError('Invitation already revoked');
    await PgAdminRepository.revokeInvitation(invitationId);
  }

  async getAuditLog(
    page: number,
    limit: number,
    filters: { userId?: string; method?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PaginatedResult<AdminAuditEntry>> {
    return PgAdminRepository.getAuditLog(page, limit, filters);
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
