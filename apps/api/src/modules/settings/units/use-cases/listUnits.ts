import type { IUnitsRepository } from '../units.repository.js';
import type { Unit } from '../../settings.types.js';

export class ListUnitsUseCase {
  constructor(private unitsRepository: IUnitsRepository) {}

  async execute(userId: string): Promise<Unit[]> {
    return this.unitsRepository.findAll(userId);
  }
}
