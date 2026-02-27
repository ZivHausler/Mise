import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../../src/core/errors/app-error.js';
import { StoreRole } from '../../../src/modules/stores/store.types.js';

vi.mock('../../../src/modules/stores/store.repository.js', () => ({
  PgStoreRepository: {
    findStoreById: vi.fn(),
    updateBusinessInfo: vi.fn(),
    updateTheme: vi.fn(),
    getUserStoreRole: vi.fn(),
    removeUserFromStore: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}));

vi.mock('../../../src/config/env.js', () => ({
  env: { FRONTEND_URL: 'http://localhost:3000', JWT_EXPIRES_IN: '7d' },
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../src/modules/notifications/channels/email.js', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
  buildStoreInviteEmail: vi.fn().mockReturnValue({ subject: 'test', html: '<p>test</p>' }),
  buildCreateStoreInviteEmail: vi.fn().mockReturnValue({ subject: 'test', html: '<p>test</p>' }),
}));

import { PgStoreRepository } from '../../../src/modules/stores/store.repository.js';
import { StoreService } from '../../../src/modules/stores/store.service.js';

const mockApp = { jwt: { sign: vi.fn().mockReturnValue('tok') } } as any;

describe('StoreService - Gap Coverage', () => {
  let service: StoreService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StoreService(mockApp);
  });

  describe('getStoreById', () => {
    it('should return store when found', async () => {
      vi.mocked(PgStoreRepository.findStoreById).mockResolvedValue({ id: 1, name: 'Bakery' } as any);
      const result = await service.getStoreById(1);
      expect(result.name).toBe('Bakery');
    });

    it('should throw NotFoundError when store not found', async () => {
      vi.mocked(PgStoreRepository.findStoreById).mockResolvedValue(null);
      await expect(service.getStoreById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateBusinessInfo', () => {
    it('should update business info', async () => {
      const updated = { id: 1, name: 'New Name', taxNumber: '123' } as any;
      vi.mocked(PgStoreRepository.updateBusinessInfo).mockResolvedValue(updated);
      const result = await service.updateBusinessInfo(1, { name: 'New Name', taxNumber: '123' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('updateTheme', () => {
    it('should update theme', async () => {
      vi.mocked(PgStoreRepository.updateTheme).mockResolvedValue(undefined);
      await expect(service.updateTheme(1, { primaryColor: '#FF0000' } as any)).resolves.toBeUndefined();
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke when user is owner', async () => {
      vi.mocked(PgStoreRepository.revokeInvitation).mockResolvedValue(true as any);
      await expect(service.revokeInvitation(1, StoreRole.OWNER, 1)).resolves.toBeUndefined();
    });

    it('should throw ForbiddenError when non-owner non-admin', async () => {
      await expect(service.revokeInvitation(1, StoreRole.EMPLOYEE, 1)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when invitation not found', async () => {
      vi.mocked(PgStoreRepository.revokeInvitation).mockResolvedValue(null as any);
      await expect(service.revokeInvitation(1, StoreRole.OWNER, 999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeMember', () => {
    it('should throw ForbiddenError when non-owner non-admin', async () => {
      await expect(service.removeMember(1, StoreRole.EMPLOYEE, 1, 2)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when removing self', async () => {
      await expect(service.removeMember(1, StoreRole.OWNER, 1, 1)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when target not a member', async () => {
      vi.mocked(PgStoreRepository.getUserStoreRole).mockResolvedValue(null);
      await expect(service.removeMember(1, StoreRole.OWNER, 1, 2)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when trying to remove an owner', async () => {
      vi.mocked(PgStoreRepository.getUserStoreRole).mockResolvedValue(StoreRole.OWNER);
      await expect(service.removeMember(1, StoreRole.OWNER, 1, 2)).rejects.toThrow(ForbiddenError);
    });

    it('should remove non-owner member when caller is owner', async () => {
      vi.mocked(PgStoreRepository.getUserStoreRole).mockResolvedValue(StoreRole.EMPLOYEE);
      vi.mocked(PgStoreRepository.removeUserFromStore).mockResolvedValue(undefined);
      await expect(service.removeMember(1, StoreRole.OWNER, 1, 2)).resolves.toBeUndefined();
    });
  });
});
