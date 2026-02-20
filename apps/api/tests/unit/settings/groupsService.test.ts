import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupsService } from '../../../src/modules/settings/groups/groups.service.js';
import { NotFoundError, ForbiddenError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/settings/groups/groupsCrud.js', () => ({
  GroupsCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { GroupsCrud } from '../../../src/modules/settings/groups/groupsCrud.js';

const STORE_ID = 'store-1';

const createGroup = (overrides?: any) => ({
  id: 'group-1',
  storeId: STORE_ID,
  name: 'Dairy',
  color: '#fff',
  icon: null,
  isDefault: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('GroupsService', () => {
  let service: GroupsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GroupsService();
  });

  describe('listGroups', () => {
    it('should return all groups for a store', async () => {
      const groups = [createGroup(), createGroup({ id: 'group-2', name: 'Grains' })];
      vi.mocked(GroupsCrud.getAll).mockResolvedValue(groups);

      const result = await service.listGroups(STORE_ID);
      expect(result).toHaveLength(2);
      expect(GroupsCrud.getAll).toHaveBeenCalledWith(STORE_ID);
    });
  });

  describe('createGroup', () => {
    it('should create a group', async () => {
      const group = createGroup();
      vi.mocked(GroupsCrud.create).mockResolvedValue(group);

      const result = await service.createGroup(STORE_ID, { name: 'Dairy', color: '#fff' });
      expect(result).toEqual(group);
    });
  });

  describe('updateGroup', () => {
    it('should update a non-default group owned by the store', async () => {
      const group = createGroup();
      vi.mocked(GroupsCrud.getById).mockResolvedValue(group);
      vi.mocked(GroupsCrud.update).mockResolvedValue({ ...group, name: 'Updated' });

      const result = await service.updateGroup('group-1', STORE_ID, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundError when group not found', async () => {
      vi.mocked(GroupsCrud.getById).mockResolvedValue(null);

      await expect(service.updateGroup('nonexistent', STORE_ID, { name: 'x' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when group is default', async () => {
      vi.mocked(GroupsCrud.getById).mockResolvedValue(createGroup({ isDefault: true }));

      await expect(service.updateGroup('group-1', STORE_ID, { name: 'x' })).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when group belongs to another store', async () => {
      vi.mocked(GroupsCrud.getById).mockResolvedValue(createGroup({ storeId: 'other-store' }));

      await expect(service.updateGroup('group-1', STORE_ID, { name: 'x' })).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteGroup', () => {
    it('should delete a non-default group owned by the store', async () => {
      vi.mocked(GroupsCrud.getById).mockResolvedValue(createGroup());
      vi.mocked(GroupsCrud.delete).mockResolvedValue(undefined);

      await expect(service.deleteGroup('group-1', STORE_ID)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when group not found', async () => {
      vi.mocked(GroupsCrud.getById).mockResolvedValue(null);

      await expect(service.deleteGroup('nonexistent', STORE_ID)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when group is default', async () => {
      vi.mocked(GroupsCrud.getById).mockResolvedValue(createGroup({ isDefault: true }));

      await expect(service.deleteGroup('group-1', STORE_ID)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when group belongs to another store', async () => {
      vi.mocked(GroupsCrud.getById).mockResolvedValue(createGroup({ storeId: 'other-store' }));

      await expect(service.deleteGroup('group-1', STORE_ID)).rejects.toThrow(ForbiddenError);
    });
  });
});
