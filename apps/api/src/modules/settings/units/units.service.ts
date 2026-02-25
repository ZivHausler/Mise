import type { Unit, UnitCategory, CreateUnitDTO, UpdateUnitDTO } from '../settings.types.js';
import { UnitsCrud } from './unitsCrud.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class UnitsService {
  async listCategories(): Promise<UnitCategory[]> {
    return UnitsCrud.getCategories();
  }

  async listUnits(storeId: number): Promise<Unit[]> {
    return UnitsCrud.getAll(storeId);
  }

  async createUnit(storeId: number, data: CreateUnitDTO): Promise<Unit> {
    // Business rule: validate category exists
    const categories = await UnitsCrud.getCategories();
    const categoryExists = categories.some((c) => c.id === data.categoryId);
    if (!categoryExists) {
      throw new ValidationError('Invalid unit category', ErrorCode.UNIT_INVALID_CATEGORY);
    }
    return UnitsCrud.create(storeId, data);
  }

  async updateUnit(unitId: number, storeId: number, data: UpdateUnitDTO): Promise<Unit> {
    const unit = await UnitsCrud.getById(unitId, storeId);
    if (!unit) throw new NotFoundError('Unit not found', ErrorCode.UNIT_NOT_FOUND);
    if (unit.isDefault) throw new ForbiddenError('Cannot modify default units', ErrorCode.UNIT_DEFAULT_IMMUTABLE);
    if (unit.storeId !== storeId) throw new ForbiddenError('Not authorized to modify this unit', ErrorCode.UNIT_NOT_AUTHORIZED);
    return UnitsCrud.update(unitId, storeId, data);
  }

  async deleteUnit(unitId: number, storeId: number): Promise<void> {
    const unit = await UnitsCrud.getById(unitId, storeId);
    if (!unit) throw new NotFoundError('Unit not found', ErrorCode.UNIT_NOT_FOUND);
    if (unit.isDefault) throw new ForbiddenError('Cannot delete default units', ErrorCode.UNIT_DEFAULT_IMMUTABLE);
    if (unit.storeId !== storeId) throw new ForbiddenError('Not authorized to delete this unit', ErrorCode.UNIT_NOT_AUTHORIZED);
    return UnitsCrud.delete(unitId, storeId);
  }
}
