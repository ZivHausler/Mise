import type { Unit, UnitCategory, CreateUnitDTO, UpdateUnitDTO } from '../settings.types.js';
import { UnitsCrud } from './unitsCrud.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../core/errors/app-error.js';

export class UnitsService {
  async listCategories(): Promise<UnitCategory[]> {
    return UnitsCrud.getCategories();
  }

  async listUnits(storeId: string): Promise<Unit[]> {
    return UnitsCrud.getAll(storeId);
  }

  async createUnit(storeId: string, data: CreateUnitDTO): Promise<Unit> {
    // Business rule: validate category exists
    const categories = await UnitsCrud.getCategories();
    const categoryExists = categories.some((c) => c.id === data.categoryId);
    if (!categoryExists) {
      throw new ValidationError('Invalid unit category');
    }
    return UnitsCrud.create(storeId, data);
  }

  async updateUnit(unitId: string, storeId: string, data: UpdateUnitDTO): Promise<Unit> {
    const unit = await UnitsCrud.getById(unitId, storeId);
    if (!unit) throw new NotFoundError('Unit not found');
    if (unit.isDefault) throw new ForbiddenError('Cannot modify default units');
    if (unit.storeId !== storeId) throw new ForbiddenError('Not authorized to modify this unit');
    return UnitsCrud.update(unitId, storeId, data);
  }

  async deleteUnit(unitId: string, storeId: string): Promise<void> {
    const unit = await UnitsCrud.getById(unitId, storeId);
    if (!unit) throw new NotFoundError('Unit not found');
    if (unit.isDefault) throw new ForbiddenError('Cannot delete default units');
    if (unit.storeId !== storeId) throw new ForbiddenError('Not authorized to delete this unit');
    return UnitsCrud.delete(unitId, storeId);
  }
}
