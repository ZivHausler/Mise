import type { IUnitsRepository } from '../units.repository.js';
import type { UpdateUnitDTO, Unit } from '../../settings.types.js';
import { NotFoundError, ForbiddenError } from '../../../../core/errors/app-error.js';

export class UpdateUnitUseCase {
  constructor(private unitsRepository: IUnitsRepository) {}

  async execute(unitId: string, userId: string, data: UpdateUnitDTO): Promise<Unit> {
    const unit = await this.unitsRepository.findById(unitId);
    if (!unit) throw new NotFoundError('Unit not found');
    if (unit.isDefault) throw new ForbiddenError('Cannot modify default units');
    if (unit.userId !== userId) throw new ForbiddenError('Not authorized to modify this unit');

    return this.unitsRepository.update(unitId, data);
  }
}
