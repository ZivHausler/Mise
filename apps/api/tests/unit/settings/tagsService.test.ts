import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/settings/tags/tagsCrud.js', () => ({
  TagsCrud: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { TagsCrud } from '../../../src/modules/settings/tags/tagsCrud.js';
import { TagsService } from '../../../src/modules/settings/tags/tags.service.js';

const STORE_ID = 1;

describe('TagsService', () => {
  let service: TagsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TagsService();
  });

  describe('listTags', () => {
    it('should return all tags for a store', async () => {
      const tags = [{ id: 1, name: 'Gluten Free', storeId: STORE_ID }];
      vi.mocked(TagsCrud.getAll).mockResolvedValue(tags as any);

      const result = await service.listTags(STORE_ID);
      expect(result).toEqual(tags);
    });
  });

  describe('createTag', () => {
    it('should create a new tag', async () => {
      const tag = { id: 1, name: 'Vegan', storeId: STORE_ID };
      vi.mocked(TagsCrud.create).mockResolvedValue(tag as any);

      const result = await service.createTag(STORE_ID, 'Vegan');
      expect(result).toEqual(tag);
    });
  });

  describe('updateTag', () => {
    it('should update tag when found', async () => {
      const existing = { id: 1, name: 'Old', storeId: STORE_ID };
      const updated = { id: 1, name: 'New', storeId: STORE_ID };
      vi.mocked(TagsCrud.getById).mockResolvedValue(existing as any);
      vi.mocked(TagsCrud.update).mockResolvedValue(updated as any);

      const result = await service.updateTag(1, STORE_ID, 'New');
      expect(result.name).toBe('New');
    });

    it('should throw NotFoundError when tag not found', async () => {
      vi.mocked(TagsCrud.getById).mockResolvedValue(null);

      await expect(service.updateTag(999, STORE_ID, 'New')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTag', () => {
    it('should delete tag when found', async () => {
      vi.mocked(TagsCrud.getById).mockResolvedValue({ id: 1 } as any);
      vi.mocked(TagsCrud.delete).mockResolvedValue(undefined);

      await expect(service.deleteTag(1, STORE_ID)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when tag not found', async () => {
      vi.mocked(TagsCrud.getById).mockResolvedValue(null);

      await expect(service.deleteTag(999, STORE_ID)).rejects.toThrow(NotFoundError);
    });
  });
});
