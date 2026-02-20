import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '../../../src/modules/admin/admin.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/admin/admin.repository.js', () => ({
  PgAdminRepository: {
    getUsers: vi.fn(),
    findUserById: vi.fn(),
    toggleAdmin: vi.fn(),
    toggleDisabled: vi.fn(),
    getStores: vi.fn(),
    getStoreMembers: vi.fn(),
    updateStore: vi.fn(),
    getInvitations: vi.fn(),
    createCreateStoreInvitation: vi.fn(),
    findInvitationById: vi.fn(),
    revokeInvitation: vi.fn(),
    getAuditLog: vi.fn(),
    getAuditLogRequestBody: vi.fn(),
    getAuditLogResponseBody: vi.fn(),
    getAnalytics: vi.fn(),
  },
}));

import { PgAdminRepository } from '../../../src/modules/admin/admin.repository.js';

const mockApp = {} as any;

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminService(mockApp);
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const result = { data: [{ id: 'u1', email: 'a@b.com', name: 'A', isAdmin: false, disabledAt: null, createdAt: new Date(), storeCount: 1 }], total: 1, page: 1, limit: 10 };
      vi.mocked(PgAdminRepository.getUsers).mockResolvedValue(result);

      const res = await service.getUsers(1, 10);
      expect(res).toEqual(result);
      expect(PgAdminRepository.getUsers).toHaveBeenCalledWith(1, 10, undefined, false);
    });

    it('should pass search and includeAdmins parameters', async () => {
      vi.mocked(PgAdminRepository.getUsers).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await service.getUsers(1, 10, 'test', true);
      expect(PgAdminRepository.getUsers).toHaveBeenCalledWith(1, 10, 'test', true);
    });
  });

  describe('toggleAdmin', () => {
    it('should toggle admin status for a non-admin user', async () => {
      vi.mocked(PgAdminRepository.findUserById).mockResolvedValue({ id: 'u2', isAdmin: false } as any);
      vi.mocked(PgAdminRepository.toggleAdmin).mockResolvedValue(undefined);

      await expect(service.toggleAdmin('u1', 'u2', true)).resolves.toBeUndefined();
      expect(PgAdminRepository.toggleAdmin).toHaveBeenCalledWith('u2', true);
    });

    it('should throw ForbiddenError when toggling own admin status', async () => {
      await expect(service.toggleAdmin('u1', 'u1', false)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when target user not found', async () => {
      vi.mocked(PgAdminRepository.findUserById).mockResolvedValue(null);

      await expect(service.toggleAdmin('u1', 'u2', true)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when target is already admin', async () => {
      vi.mocked(PgAdminRepository.findUserById).mockResolvedValue({ id: 'u2', isAdmin: true } as any);

      await expect(service.toggleAdmin('u1', 'u2', false)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('toggleDisabled', () => {
    it('should toggle disabled status for a non-admin user', async () => {
      vi.mocked(PgAdminRepository.findUserById).mockResolvedValue({ id: 'u2', isAdmin: false } as any);
      vi.mocked(PgAdminRepository.toggleDisabled).mockResolvedValue(undefined);

      await expect(service.toggleDisabled('u1', 'u2', true)).resolves.toBeUndefined();
    });

    it('should throw ForbiddenError when disabling own account', async () => {
      await expect(service.toggleDisabled('u1', 'u1', true)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when target user not found', async () => {
      vi.mocked(PgAdminRepository.findUserById).mockResolvedValue(null);

      await expect(service.toggleDisabled('u1', 'u2', true)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when target is admin', async () => {
      vi.mocked(PgAdminRepository.findUserById).mockResolvedValue({ id: 'u2', isAdmin: true } as any);

      await expect(service.toggleDisabled('u1', 'u2', true)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getStores', () => {
    it('should return paginated stores', async () => {
      const result = { data: [], total: 0, page: 1, limit: 10 };
      vi.mocked(PgAdminRepository.getStores).mockResolvedValue(result);

      const res = await service.getStores(1, 10, 'bakery');
      expect(PgAdminRepository.getStores).toHaveBeenCalledWith(1, 10, 'bakery');
    });
  });

  describe('getStoreMembers', () => {
    it('should return store members', async () => {
      const members = [{ userId: 'u1', email: 'a@b.com', name: 'A', role: 1, joinedAt: new Date() }];
      vi.mocked(PgAdminRepository.getStoreMembers).mockResolvedValue(members);

      const res = await service.getStoreMembers('store-1');
      expect(res).toEqual(members);
    });
  });

  describe('updateStore', () => {
    it('should update store when data is provided', async () => {
      vi.mocked(PgAdminRepository.updateStore).mockResolvedValue(undefined);

      await expect(service.updateStore('store-1', { name: 'New Name' })).resolves.toBeUndefined();
    });

    it('should throw ValidationError when no fields provided', async () => {
      await expect(service.updateStore('store-1', {})).rejects.toThrow(ValidationError);
    });
  });

  describe('getInvitations', () => {
    it('should return paginated invitations', async () => {
      const result = { data: [], total: 0, page: 1, limit: 10 };
      vi.mocked(PgAdminRepository.getInvitations).mockResolvedValue(result);

      const res = await service.getInvitations(1, 10, { status: 'pending' });
      expect(res).toEqual(result);
    });

    it('should throw ValidationError for invalid status filter', async () => {
      await expect(service.getInvitations(1, 10, { status: 'invalid' })).rejects.toThrow(ValidationError);
    });
  });

  describe('createStoreInvitation', () => {
    it('should create invitation with valid email', async () => {
      const invitation = { id: 'inv-1', email: 'test@example.com' } as any;
      vi.mocked(PgAdminRepository.createCreateStoreInvitation).mockResolvedValue(invitation);

      const res = await service.createStoreInvitation('test@example.com');
      expect(res).toEqual(invitation);
    });

    it('should throw ValidationError for invalid email', async () => {
      await expect(service.createStoreInvitation('invalid')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty email', async () => {
      await expect(service.createStoreInvitation('')).rejects.toThrow(ValidationError);
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke a pending invitation', async () => {
      vi.mocked(PgAdminRepository.findInvitationById).mockResolvedValue({ id: 'inv-1', usedAt: null, revokedAt: null } as any);
      vi.mocked(PgAdminRepository.revokeInvitation).mockResolvedValue(undefined);

      await expect(service.revokeInvitation('inv-1')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when invitation not found', async () => {
      vi.mocked(PgAdminRepository.findInvitationById).mockResolvedValue(null);

      await expect(service.revokeInvitation('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when invitation already used', async () => {
      vi.mocked(PgAdminRepository.findInvitationById).mockResolvedValue({ id: 'inv-1', usedAt: new Date(), revokedAt: null } as any);

      await expect(service.revokeInvitation('inv-1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when invitation already revoked', async () => {
      vi.mocked(PgAdminRepository.findInvitationById).mockResolvedValue({ id: 'inv-1', usedAt: null, revokedAt: new Date() } as any);

      await expect(service.revokeInvitation('inv-1')).rejects.toThrow(ValidationError);
    });
  });

  describe('getAuditLog', () => {
    it('should return paginated audit log', async () => {
      const result = { data: [], total: 0, page: 1, limit: 10 };
      vi.mocked(PgAdminRepository.getAuditLog).mockResolvedValue(result);

      const res = await service.getAuditLog(1, 10, {});
      expect(res).toEqual(result);
    });
  });

  describe('getAuditLogRequestBody', () => {
    it('should return request body', async () => {
      vi.mocked(PgAdminRepository.getAuditLogRequestBody).mockResolvedValue({ foo: 'bar' });

      const res = await service.getAuditLogRequestBody('audit-1');
      expect(res).toEqual({ foo: 'bar' });
    });
  });

  describe('getAuditLogResponseBody', () => {
    it('should return response body', async () => {
      vi.mocked(PgAdminRepository.getAuditLogResponseBody).mockResolvedValue({ ok: true });

      const res = await service.getAuditLogResponseBody('audit-1');
      expect(res).toEqual({ ok: true });
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics for week range', async () => {
      const analytics = { totalUsers: 10, totalStores: 2, activeInvitations: 1, signupsPerDay: [] };
      vi.mocked(PgAdminRepository.getAnalytics).mockResolvedValue(analytics);

      const res = await service.getAnalytics('week');
      expect(res).toEqual(analytics);
      expect(PgAdminRepository.getAnalytics).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should return analytics for month range', async () => {
      vi.mocked(PgAdminRepository.getAnalytics).mockResolvedValue({ totalUsers: 0, totalStores: 0, activeInvitations: 0, signupsPerDay: [] });

      await service.getAnalytics('month');
      expect(PgAdminRepository.getAnalytics).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should return analytics for year range', async () => {
      vi.mocked(PgAdminRepository.getAnalytics).mockResolvedValue({ totalUsers: 0, totalStores: 0, activeInvitations: 0, signupsPerDay: [] });

      await service.getAnalytics('year');
      expect(PgAdminRepository.getAnalytics).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should default to month range for unknown range', async () => {
      vi.mocked(PgAdminRepository.getAnalytics).mockResolvedValue({ totalUsers: 0, totalStores: 0, activeInvitations: 0, signupsPerDay: [] });

      await service.getAnalytics('unknown');
      expect(PgAdminRepository.getAnalytics).toHaveBeenCalledWith(expect.any(Date));
    });
  });
});
