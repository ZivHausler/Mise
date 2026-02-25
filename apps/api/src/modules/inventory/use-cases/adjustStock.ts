import type { UseCase } from '../../../core/use-case.js';
import type { AdjustStockDTO, Ingredient } from '../inventory.types.js';
import { InventoryCrud } from '../inventoryCrud.js';
import { NotFoundError, ValidationError } from '../../../core/errors/app-error.js';
import { getEventBus } from '../../../core/events/event-bus.js';
import { EventNames } from '../../../core/events/event-names.js';
import { ErrorCode } from '@mise/shared';

export class AdjustStockUseCase implements UseCase<Ingredient, [number, AdjustStockDTO]> {
  async execute(storeId: number, data: AdjustStockDTO, correlationId?: string, options?: { suppressEvent?: boolean }): Promise<Ingredient> {
    const existing = await InventoryCrud.getById(storeId, data.ingredientId);
    if (!existing) {
      throw new NotFoundError('Ingredient not found', ErrorCode.INGREDIENT_NOT_FOUND);
    }
    if (data.quantity <= 0) {
      throw new ValidationError('Adjustment quantity must be positive', ErrorCode.STOCK_ADJUSTMENT_POSITIVE);
    }

    const ingredient = await InventoryCrud.adjustStock(storeId, data);

    if (ingredient.quantity <= ingredient.lowStockThreshold && !options?.suppressEvent) {
      await getEventBus().publish({
        eventName: EventNames.INVENTORY_LOW_STOCK,
        payload: {
          items: [{
            ingredientId: ingredient.id,
            name: ingredient.name,
            currentQuantity: ingredient.quantity,
            threshold: ingredient.lowStockThreshold,
            unit: ingredient.unit,
          }],
        },
        timestamp: new Date(),
        correlationId,
      });
    }

    return ingredient;
  }
}
