import type { IInventoryRepository } from '../inventory.repository.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class DeleteIngredientUseCase {
  constructor(private inventoryRepository: IInventoryRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.inventoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Ingredient not found');
    }
    return this.inventoryRepository.delete(id);
  }
}
