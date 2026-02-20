import { PgUnitsRepository } from './units.repository.js';
import type { CreateUnitDTO, Unit, UnitCategory, UpdateUnitDTO } from '../settings.types.js';

export class UnitsCrud {
  static async create(storeId: string, data: CreateUnitDTO): Promise<Unit> {
    return PgUnitsRepository.create(storeId, data);
  }

  static async getById(id: string, storeId: string): Promise<Unit | null> {
    return PgUnitsRepository.findById(id, storeId);
  }

  static async getAll(storeId: string): Promise<Unit[]> {
    return PgUnitsRepository.findAll(storeId);
  }

  static async getCategories(): Promise<UnitCategory[]> {
    return PgUnitsRepository.findAllCategories();
  }

  static async update(unitId: string, storeId: string, data: UpdateUnitDTO): Promise<Unit> {
    return PgUnitsRepository.update(unitId, storeId, data);
  }

  static async delete(unitId: string, storeId: string): Promise<void> {
    await PgUnitsRepository.delete(unitId, storeId);
  }
}
