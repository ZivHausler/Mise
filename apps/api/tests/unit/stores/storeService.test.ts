import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreService } from '../../../src/modules/stores/store.service.js';
import { StoreRole } from '../../../src/modules/stores/store.types.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/stores/store.repository.js', () => ({
  PgStoreRepository: {
    createStore: vi.fn(),
    addUserToStore: vi.fn(),
    markInvitationUsed: vi.fn(),
    getUserStores: vi.fn(),
    getUserStoreRole: vi.fn(),
    getAllStores: vi.fn(),
    getStoreMembers: vi.fn(),
    getPendingInvitations: vi.fn(),
    createInvitation: vi.fn(),
    findInvitationByToken: vi.fn(),
    createCreateStoreInvitation: vi.fn(),
  },
}));

vi.mock('../../../src/config/env.js', () => ({
  env: {
    FRONTEND_URL: 'http://localhost:3000',
    JWT_EXPIRES_IN: '7d',
  },
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { PgStoreRepository } from '../../../src/modules/stores/store.repository.js';

const createMockApp = () => ({
  jwt: {
    sign: vi.fn().mockReturnValue('mock-token'),
  },
}) as any;

describe('StoreService', () => {
  let service: StoreService;
  let mockApp: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = createMockApp();
    service = new StoreService(mockApp);
  });

  describe('createStore', () => {
    it('should create a store with valid invitation token', async () => {
      const store = { id: 's1', name: 'Bakery', code: null, address: null, createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue({ storeId: null, token: 'tok' } as any);
      vi.mocked(PgStoreRepository.createStore).mockResolvedValue(store);
      vi.mocked(PgStoreRepository.addUserToStore).mockResolvedValue(undefined as any);
      vi.mocked(PgStoreRepository.markInvitationUsed).mockResolvedValue(undefined as any);

      const result = await service.createStore('u1', 'u@test.com', { name: 'Bakery' }, 'tok');
      expect(result.store).toEqual(store);
      expect(result.token).toBe('mock-token');
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createStore('u1', 'u@test.com', { name: '  ' }, 'tok')).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError when no invite token', async () => {
      await expect(service.createStore('u1', 'u@test.com', { name: 'Bakery' })).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when invitation is invalid', async () => {
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue(null);

      await expect(service.createStore('u1', 'u@test.com', { name: 'Bakery' }, 'bad')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when invitation is a join-store invitation', async () => {
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue({ storeId: 999 } as any);

      await expect(service.createStore('u1', 'u@test.com', { name: 'Bakery' }, 'tok')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getMyStores', () => {
    it('should return user stores', async () => {
      const stores = [{ userId: 'u1', storeId: 's1', role: StoreRole.OWNER, storeName: 'Bakery', storeCode: null }];
      vi.mocked(PgStoreRepository.getUserStores).mockResolvedValue(stores);

      const result = await service.getMyStores('u1');
      expect(result).toEqual(stores);
    });
  });

  describe('selectStore', () => {
    it('should select store for a user with valid role', async () => {
      vi.mocked(PgStoreRepository.getUserStoreRole).mockResolvedValue(StoreRole.OWNER);

      const result = await service.selectStore('u1', 'u@test.com', 's1');
      expect(result.token).toBe('mock-token');
    });

    it('should throw ForbiddenError when user has no role in store', async () => {
      vi.mocked(PgStoreRepository.getUserStoreRole).mockResolvedValue(null);

      await expect(service.selectStore('u1', 'u@test.com', 's1')).rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to select any store', async () => {
      vi.mock('../../../src/core/database/postgres.js', () => ({
        getPool: vi.fn().mockReturnValue({
          query: vi.fn().mockResolvedValue({ rows: [{ id: 's1' }] }),
        }),
      }));

      const result = await service.selectStore('u1', 'u@test.com', 's1', true);
      expect(result.token).toBe('mock-token');
    });
  });

  describe('getAllStores', () => {
    it('should return all stores', async () => {
      const stores = [{ id: 's1', name: 'Bakery' }] as any;
      vi.mocked(PgStoreRepository.getAllStores).mockResolvedValue(stores);

      const result = await service.getAllStores();
      expect(result).toEqual(stores);
    });
  });

  describe('getStoreMembers', () => {
    it('should return store members', async () => {
      const members = [{ userId: 'u1', email: 'u@test.com', name: 'User', role: StoreRole.OWNER }];
      vi.mocked(PgStoreRepository.getStoreMembers).mockResolvedValue(members);

      const result = await service.getStoreMembers('s1');
      expect(result).toEqual(members);
    });
  });

  describe('getPendingInvitations', () => {
    it('should return formatted pending invitations', async () => {
      vi.mocked(PgStoreRepository.getPendingInvitations).mockResolvedValue([
        { email: 'a@test.com', role: StoreRole.EMPLOYEE, token: 'tok1', createdAt: new Date(), expiresAt: new Date() },
      ] as any);

      const result = await service.getPendingInvitations('s1');
      expect(result[0].inviteLink).toContain('/invite/tok1');
    });
  });

  describe('sendInvite', () => {
    it('should send invite when user is owner', async () => {
      const invitation = { id: 'inv-1', token: 'tok', email: 'a@test.com', storeId: 's1', role: StoreRole.EMPLOYEE } as any;
      vi.mocked(PgStoreRepository.createInvitation).mockResolvedValue(invitation);

      const result = await service.sendInvite('s1', StoreRole.OWNER, 'a@test.com', StoreRole.EMPLOYEE);
      expect(result.inviteLink).toContain('/invite/tok');
    });

    it('should send invite when user is admin', async () => {
      const invitation = { id: 'inv-1', token: 'tok', email: 'a@test.com' } as any;
      vi.mocked(PgStoreRepository.createInvitation).mockResolvedValue(invitation);

      const result = await service.sendInvite('s1', StoreRole.EMPLOYEE, 'a@test.com', StoreRole.EMPLOYEE, true);
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenError when non-owner non-admin sends invite', async () => {
      await expect(
        service.sendInvite('s1', StoreRole.EMPLOYEE, 'a@test.com', StoreRole.EMPLOYEE),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('validateInvite', () => {
    it('should return invite details for valid token', async () => {
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue({
        storeName: 'Bakery', email: 'a@test.com', role: StoreRole.EMPLOYEE, storeId: 's1',
      } as any);

      const result = await service.validateInvite('tok');
      expect(result.type).toBe('join_store');
      expect(result.storeName).toBe('Bakery');
    });

    it('should return create_store type when storeId is null', async () => {
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue({
        storeName: null, email: 'a@test.com', role: StoreRole.OWNER, storeId: null,
      } as any);

      const result = await service.validateInvite('tok');
      expect(result.type).toBe('create_store');
    });

    it('should throw NotFoundError for invalid token', async () => {
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue(null);

      await expect(service.validateInvite('bad')).rejects.toThrow(NotFoundError);
    });
  });

  describe('acceptInvite', () => {
    it('should accept a join-store invitation', async () => {
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue({
        storeId: 's1', role: StoreRole.EMPLOYEE,
      } as any);
      vi.mocked(PgStoreRepository.addUserToStore).mockResolvedValue(undefined as any);
      vi.mocked(PgStoreRepository.markInvitationUsed).mockResolvedValue(undefined as any);

      const result = await service.acceptInvite('u1', 'tok');
      expect(result.storeId).toBe('s1');
      expect(result.role).toBe(StoreRole.EMPLOYEE);
    });

    it('should throw NotFoundError for invalid token', async () => {
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue(null);

      await expect(service.acceptInvite('u1', 'bad')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for create-store invitation', async () => {
      vi.mocked(PgStoreRepository.findInvitationByToken).mockResolvedValue({
        storeId: null, role: StoreRole.OWNER,
      } as any);

      await expect(service.acceptInvite('u1', 'tok')).rejects.toThrow(ValidationError);
    });
  });

  describe('createCreateStoreInvitation', () => {
    it('should create a create-store invitation', async () => {
      const invitation = { id: 'inv-1', token: 'tok', email: 'a@test.com' } as any;
      vi.mocked(PgStoreRepository.createCreateStoreInvitation).mockResolvedValue(invitation);

      const result = await service.createCreateStoreInvitation('a@test.com');
      expect(result.inviteLink).toContain('/invite/tok');
    });
  });

  describe('generateTokenWithStore', () => {
    it('should generate JWT with store info', () => {
      const token = service.generateTokenWithStore('u1', 'u@test.com', 's1', StoreRole.OWNER);
      expect(token).toBe('mock-token');
      expect(mockApp.jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', email: 'u@test.com', storeId: 's1', storeRole: StoreRole.OWNER }),
        expect.any(Object),
      );
    });

    it('should include isAdmin flag when true', () => {
      service.generateTokenWithStore('u1', 'u@test.com', 's1', StoreRole.ADMIN, true);
      expect(mockApp.jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ isAdmin: true }),
        expect.any(Object),
      );
    });
  });

  describe('generateTokenWithoutStore', () => {
    it('should generate JWT without store info', () => {
      const token = service.generateTokenWithoutStore('u1', 'u@test.com');
      expect(token).toBe('mock-token');
      expect(mockApp.jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', email: 'u@test.com' }),
        expect.any(Object),
      );
    });
  });
});
