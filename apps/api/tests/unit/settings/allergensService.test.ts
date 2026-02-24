import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AllergensService } from '../../../src/modules/settings/allergens/allergens.service.js';
import { NotFoundError, ForbiddenError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/settings/allergens/allergensCrud.js', () => ({
  AllergensCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { AllergensCrud } from '../../../src/modules/settings/allergens/allergensCrud.js';

const STORE_ID = 1;

const createAllergen = (overrides?: any) => ({
  id: 'allergen-1',
  storeId: STORE_ID,
  name: 'Dairy',
  color: '#fff',
  icon: null,
  isDefault: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('AllergensService', () => {
  let service: AllergensService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AllergensService();
  });

  describe('listAllergens', () => {
    it('should return all allergens for a store', async () => {
      const allergens = [createAllergen(), createAllergen({ id: 'allergen-2', name: 'Grains' })];
      vi.mocked(AllergensCrud.getAll).mockResolvedValue(allergens);

      const result = await service.listAllergens(STORE_ID);
      expect(result).toHaveLength(2);
      expect(AllergensCrud.getAll).toHaveBeenCalledWith(STORE_ID);
    });
  });

  describe('createAllergen', () => {
    it('should create an allergen', async () => {
      const allergen = createAllergen();
      vi.mocked(AllergensCrud.create).mockResolvedValue(allergen);

      const result = await service.createAllergen(STORE_ID, { name: 'Dairy', color: '#fff' });
      expect(result).toEqual(allergen);
    });
  });

  describe('updateAllergen', () => {
    it('should update a non-default allergen owned by the store', async () => {
      const allergen = createAllergen();
      vi.mocked(AllergensCrud.getById).mockResolvedValue(allergen);
      vi.mocked(AllergensCrud.update).mockResolvedValue({ ...allergen, name: 'Updated' });

      const result = await service.updateAllergen('allergen-1', STORE_ID, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundError when allergen not found', async () => {
      vi.mocked(AllergensCrud.getById).mockResolvedValue(null);

      await expect(service.updateAllergen(999, STORE_ID, { name: 'x' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when allergen is default', async () => {
      vi.mocked(AllergensCrud.getById).mockResolvedValue(createAllergen({ isDefault: true }));

      await expect(service.updateAllergen('allergen-1', STORE_ID, { name: 'x' })).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when allergen belongs to another store', async () => {
      vi.mocked(AllergensCrud.getById).mockResolvedValue(createAllergen({ storeId: 999 }));

      await expect(service.updateAllergen('allergen-1', STORE_ID, { name: 'x' })).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteAllergen', () => {
    it('should delete a non-default allergen owned by the store', async () => {
      vi.mocked(AllergensCrud.getById).mockResolvedValue(createAllergen());
      vi.mocked(AllergensCrud.delete).mockResolvedValue(undefined);

      await expect(service.deleteAllergen('allergen-1', STORE_ID)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when allergen not found', async () => {
      vi.mocked(AllergensCrud.getById).mockResolvedValue(null);

      await expect(service.deleteAllergen(999, STORE_ID)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when allergen is default', async () => {
      vi.mocked(AllergensCrud.getById).mockResolvedValue(createAllergen({ isDefault: true }));

      await expect(service.deleteAllergen('allergen-1', STORE_ID)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when allergen belongs to another store', async () => {
      vi.mocked(AllergensCrud.getById).mockResolvedValue(createAllergen({ storeId: 999 }));

      await expect(service.deleteAllergen('allergen-1', STORE_ID)).rejects.toThrow(ForbiddenError);
    });
  });
});
