import type { IUnitsRepository } from './units.repository.js';
import type { Unit, UnitCategory, CreateUnitDTO, UpdateUnitDTO } from '../settings.types.js';
import { ListUnitsUseCase } from './use-cases/listUnits.js';
import { CreateUnitUseCase } from './use-cases/createUnit.js';
import { UpdateUnitUseCase } from './use-cases/updateUnit.js';
import { DeleteUnitUseCase } from './use-cases/deleteUnit.js';

export class UnitsService {
  private listUnitsUseCase: ListUnitsUseCase;
  private createUnitUseCase: CreateUnitUseCase;
  private updateUnitUseCase: UpdateUnitUseCase;
  private deleteUnitUseCase: DeleteUnitUseCase;

  constructor(private unitsRepository: IUnitsRepository) {
    this.listUnitsUseCase = new ListUnitsUseCase(unitsRepository);
    this.createUnitUseCase = new CreateUnitUseCase(unitsRepository);
    this.updateUnitUseCase = new UpdateUnitUseCase(unitsRepository);
    this.deleteUnitUseCase = new DeleteUnitUseCase(unitsRepository);
  }

  async listCategories(): Promise<UnitCategory[]> {
    return this.unitsRepository.findAllCategories();
  }

  async listUnits(userId: string): Promise<Unit[]> {
    return this.listUnitsUseCase.execute(userId);
  }

  async createUnit(userId: string, data: CreateUnitDTO): Promise<Unit> {
    return this.createUnitUseCase.execute(userId, data);
  }

  async updateUnit(unitId: string, userId: string, data: UpdateUnitDTO): Promise<Unit> {
    return this.updateUnitUseCase.execute(unitId, userId, data);
  }

  async deleteUnit(unitId: string, userId: string): Promise<void> {
    return this.deleteUnitUseCase.execute(unitId, userId);
  }
}
