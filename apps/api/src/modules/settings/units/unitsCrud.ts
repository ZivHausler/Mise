import { PgUnitsRepository } from './units.repository.js';
import type { CreateUnitDTO, Unit, UnitCategory, UpdateUnitDTO } from '../settings.types.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../core/errors/app-error.js';

export class UnitsCrud {
  static async create(storeId: string, data: CreateUnitDTO): Promise<Unit> {
    const categories = await PgUnitsRepository.findAllCategories();
    const categoryExists = categories.some((c) => c.id === data.categoryId);
    if (!categoryExists) {
      throw new ValidationError('Invalid unit category');
    }
    return PgUnitsRepository.create(storeId, data);
  }

  static async getById(id: string): Promise<Unit | null> {
    return PgUnitsRepository.findById(id);
  }

  static async getAll(storeId: string): Promise<Unit[]> {
    return PgUnitsRepository.findAll(storeId);
  }

  static async getCategories(): Promise<UnitCategory[]> {
    return PgUnitsRepository.findAllCategories();
  }

  static async update(unitId: string, storeId: string, data: UpdateUnitDTO): Promise<Unit> {
    const unit = await PgUnitsRepository.findById(unitId);
    if (!unit) throw new NotFoundError('Unit not found');
    if (unit.isDefault) throw new ForbiddenError('Cannot modify default units');
    if (unit.storeId !== storeId) throw new ForbiddenError('Not authorized to modify this unit');
    return PgUnitsRepository.update(unitId, data);
  }

  static async delete(unitId: string, storeId: string): Promise<void> {
    const unit = await PgUnitsRepository.findById(unitId);
    if (!unit) throw new NotFoundError('Unit not found');
    if (unit.isDefault) throw new ForbiddenError('Cannot delete default units');
    if (unit.storeId !== storeId) throw new ForbiddenError('Not authorized to delete this unit');
    await PgUnitsRepository.delete(unitId);
  }
}
