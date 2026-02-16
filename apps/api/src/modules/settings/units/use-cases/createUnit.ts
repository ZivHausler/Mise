import type { IUnitsRepository } from '../units.repository.js';
import type { CreateUnitDTO, Unit } from '../../settings.types.js';
import { ValidationError } from '../../../../core/errors/app-error.js';

export class CreateUnitUseCase {
  constructor(private unitsRepository: IUnitsRepository) {}

  async execute(userId: string, data: CreateUnitDTO): Promise<Unit> {
    // Verify category exists
    const categories = await this.unitsRepository.findAllCategories();
    const categoryExists = categories.some((c) => c.id === data.categoryId);
    if (!categoryExists) {
      throw new ValidationError('Invalid unit category');
    }

    return this.unitsRepository.create(userId, data);
  }
}
