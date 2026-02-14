import type { IInventoryRepository } from '../inventory.repository.js';
import type { CreateIngredientDTO, Ingredient } from '../inventory.types.js';
import { ValidationError } from '../../../core/errors/app-error.js';

export class CreateIngredientUseCase {
  constructor(private inventoryRepository: IInventoryRepository) {}

  async execute(data: CreateIngredientDTO): Promise<Ingredient> {
    if (!data.name.trim()) {
      throw new ValidationError('Ingredient name is required');
    }
    if (data.quantity < 0) {
      throw new ValidationError('Quantity must be non-negative');
    }
    if (data.costPerUnit < 0) {
      throw new ValidationError('Cost per unit must be non-negative');
    }
    return this.inventoryRepository.create(data);
  }
}
