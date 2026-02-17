import type { UseCase } from '../../../core/use-case.js';
import type { AdjustStockDTO, Ingredient } from '../inventory.types.js';
import { InventoryCrud } from '../inventoryCrud.js';
import { NotFoundError, ValidationError } from '../../../core/errors/app-error.js';
import { getEventBus } from '../../../core/events/event-bus.js';

export class AdjustStockUseCase implements UseCase<Ingredient, [string, AdjustStockDTO]> {
  async execute(storeId: string, data: AdjustStockDTO): Promise<Ingredient> {
    const existing = await InventoryCrud.getById(storeId, data.ingredientId);
    if (!existing) {
      throw new NotFoundError('Ingredient not found');
    }
    if (data.quantity <= 0) {
      throw new ValidationError('Adjustment quantity must be positive');
    }

    const ingredient = await InventoryCrud.adjustStock(storeId, data);

    if (ingredient.quantity <= ingredient.lowStockThreshold) {
      await getEventBus().publish({
        eventName: 'inventory.lowStock',
        payload: {
          ingredientId: ingredient.id,
          name: ingredient.name,
          currentQuantity: ingredient.quantity,
          threshold: ingredient.lowStockThreshold,
        },
        timestamp: new Date(),
      });
    }

    return ingredient;
  }
}
