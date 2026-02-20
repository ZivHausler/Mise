import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnitsService } from '../../../src/modules/settings/units/units.service.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/settings/units/unitsCrud.js', () => ({
  UnitsCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    getCategories: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { UnitsCrud } from '../../../src/modules/settings/units/unitsCrud.js';

const STORE_ID = 'store-1';

const createUnit = (overrides?: any) => ({
  id: 'unit-1',
  storeId: STORE_ID,
  categoryId: 'cat-1',
  name: 'Kilogram',
  abbreviation: 'kg',
  conversionFactor: 1,
  isDefault: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

const createCategory = (overrides?: any) => ({
  id: 'cat-1',
  name: 'Weight',
  createdAt: new Date('2025-01-01'),
  ...overrides,
});

describe('UnitsService', () => {
  let service: UnitsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UnitsService();
  });

  describe('listCategories', () => {
    it('should return all categories', async () => {
      const categories = [createCategory(), createCategory({ id: 'cat-2', name: 'Volume' })];
      vi.mocked(UnitsCrud.getCategories).mockResolvedValue(categories);

      const result = await service.listCategories();
      expect(result).toHaveLength(2);
    });
  });

  describe('listUnits', () => {
    it('should return all units for a store', async () => {
      const units = [createUnit()];
      vi.mocked(UnitsCrud.getAll).mockResolvedValue(units);

      const result = await service.listUnits(STORE_ID);
      expect(result).toHaveLength(1);
      expect(UnitsCrud.getAll).toHaveBeenCalledWith(STORE_ID);
    });
  });

  describe('createUnit', () => {
    it('should create a unit when category exists', async () => {
      vi.mocked(UnitsCrud.getCategories).mockResolvedValue([createCategory()]);
      const unit = createUnit();
      vi.mocked(UnitsCrud.create).mockResolvedValue(unit);

      const result = await service.createUnit(STORE_ID, {
        categoryId: 'cat-1',
        name: 'Kilogram',
        abbreviation: 'kg',
        conversionFactor: 1,
      });
      expect(result).toEqual(unit);
    });

    it('should throw ValidationError when category does not exist', async () => {
      vi.mocked(UnitsCrud.getCategories).mockResolvedValue([createCategory()]);

      await expect(
        service.createUnit(STORE_ID, {
          categoryId: 'nonexistent',
          name: 'Test',
          abbreviation: 'tst',
          conversionFactor: 1,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateUnit', () => {
    it('should update a non-default unit owned by the store', async () => {
      const unit = createUnit();
      vi.mocked(UnitsCrud.getById).mockResolvedValue(unit);
      vi.mocked(UnitsCrud.update).mockResolvedValue({ ...unit, name: 'Updated' });

      const result = await service.updateUnit('unit-1', STORE_ID, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundError when unit not found', async () => {
      vi.mocked(UnitsCrud.getById).mockResolvedValue(null);

      await expect(service.updateUnit('nonexistent', STORE_ID, { name: 'x' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when unit is default', async () => {
      vi.mocked(UnitsCrud.getById).mockResolvedValue(createUnit({ isDefault: true }));

      await expect(service.updateUnit('unit-1', STORE_ID, { name: 'x' })).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when unit belongs to another store', async () => {
      vi.mocked(UnitsCrud.getById).mockResolvedValue(createUnit({ storeId: 'other-store' }));

      await expect(service.updateUnit('unit-1', STORE_ID, { name: 'x' })).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteUnit', () => {
    it('should delete a non-default unit owned by the store', async () => {
      vi.mocked(UnitsCrud.getById).mockResolvedValue(createUnit());
      vi.mocked(UnitsCrud.delete).mockResolvedValue(undefined);

      await expect(service.deleteUnit('unit-1', STORE_ID)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when unit not found', async () => {
      vi.mocked(UnitsCrud.getById).mockResolvedValue(null);

      await expect(service.deleteUnit('nonexistent', STORE_ID)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when unit is default', async () => {
      vi.mocked(UnitsCrud.getById).mockResolvedValue(createUnit({ isDefault: true }));

      await expect(service.deleteUnit('unit-1', STORE_ID)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when unit belongs to another store', async () => {
      vi.mocked(UnitsCrud.getById).mockResolvedValue(createUnit({ storeId: 'other-store' }));

      await expect(service.deleteUnit('unit-1', STORE_ID)).rejects.toThrow(ForbiddenError);
    });
  });
});
