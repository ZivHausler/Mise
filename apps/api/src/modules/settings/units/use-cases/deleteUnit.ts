import type { IUnitsRepository } from '../units.repository.js';
import { NotFoundError, ForbiddenError } from '../../../../core/errors/app-error.js';

export class DeleteUnitUseCase {
  constructor(private unitsRepository: IUnitsRepository) {}

  async execute(unitId: string, userId: string): Promise<void> {
    const unit = await this.unitsRepository.findById(unitId);
    if (!unit) throw new NotFoundError('Unit not found');
    if (unit.isDefault) throw new ForbiddenError('Cannot delete default units');
    if (unit.userId !== userId) throw new ForbiddenError('Not authorized to delete this unit');

    await this.unitsRepository.delete(unitId);
  }
}
