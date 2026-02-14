import type { IInventoryRepository } from '../inventory.repository.js';
import type { AdjustStockDTO, Ingredient } from '../inventory.types.js';
import { NotFoundError, ValidationError } from '../../../core/errors/app-error.js';

export class AdjustStockUseCase {
  constructor(private inventoryRepository: IInventoryRepository) {}

  async execute(data: AdjustStockDTO): Promise<Ingredient> {
    const existing = await this.inventoryRepository.findById(data.ingredientId);
    if (!existing) {
      throw new NotFoundError('Ingredient not found');
    }
    if (data.quantity <= 0) {
      throw new ValidationError('Adjustment quantity must be positive');
    }
    if (data.type === 'usage' && existing.quantity < data.quantity) {
      throw new ValidationError('Insufficient stock for this usage');
    }
    return this.inventoryRepository.adjustStock(data);
  }
}
