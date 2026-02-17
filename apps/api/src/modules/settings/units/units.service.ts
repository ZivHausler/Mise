import type { Unit, UnitCategory, CreateUnitDTO, UpdateUnitDTO } from '../settings.types.js';
import { UnitsCrud } from './unitsCrud.js';

export class UnitsService {
  async listCategories(): Promise<UnitCategory[]> {
    return UnitsCrud.getCategories();
  }

  async listUnits(storeId: string): Promise<Unit[]> {
    return UnitsCrud.getAll(storeId);
  }

  async createUnit(storeId: string, data: CreateUnitDTO): Promise<Unit> {
    return UnitsCrud.create(storeId, data);
  }

  async updateUnit(unitId: string, storeId: string, data: UpdateUnitDTO): Promise<Unit> {
    return UnitsCrud.update(unitId, storeId, data);
  }

  async deleteUnit(unitId: string, storeId: string): Promise<void> {
    return UnitsCrud.delete(unitId, storeId);
  }
}
