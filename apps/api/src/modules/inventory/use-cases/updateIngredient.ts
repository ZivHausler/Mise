import type { IInventoryRepository } from '../inventory.repository.js';
import type { UpdateIngredientDTO, Ingredient } from '../inventory.types.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class UpdateIngredientUseCase {
  constructor(private inventoryRepository: IInventoryRepository) {}

  async execute(id: string, data: UpdateIngredientDTO): Promise<Ingredient> {
    const existing = await this.inventoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Ingredient not found');
    }
    return this.inventoryRepository.update(id, data);
  }
}
