import type { UseCase } from '../../../core/use-case.js';
import { RecipeCrud } from '../recipeCrud.js';
import type { InventoryService } from '../../inventory/inventory.service.js';
import { NotFoundError } from '../../../core/errors/app-error.js';
import { unitConversionFactor } from '../../shared/unitConversion.js';

export class CalculateRecipeCostUseCase implements UseCase<number, [number, string, Set<string>?]> {
  constructor(private inventoryService?: InventoryService) {}

  async execute(storeId: number, recipeId: string, visited = new Set<string>()): Promise<number> {
    if (visited.has(recipeId)) {
      return 0;
    }
    visited.add(recipeId);

    const recipe = await RecipeCrud.getById(storeId, recipeId);
    if (!recipe) {
      throw new NotFoundError(`Recipe ${recipeId} not found`);
    }

    let totalCost = 0;

    for (const ingredient of recipe.ingredients) {
      let costPerUnit = ingredient.costPerUnit ?? 0;
      let factor = 1;

      if (this.inventoryService) {
        try {
          const item = await this.inventoryService.getById(storeId, Number(ingredient.ingredientId));
          costPerUnit = item.costPerUnit;
          factor = unitConversionFactor(ingredient.unit, item.unit);
        } catch {
          // use stored costPerUnit if inventory item not found
        }
      }

      totalCost += costPerUnit * ingredient.quantity * factor;
    }

    for (const step of recipe.steps) {
      if (step.type === 'sub_recipe' && step.recipeId) {
        const subCost = await this.execute(storeId, step.recipeId, visited);
        totalCost += subCost * (step.quantity ?? 1);
      }
    }

    return totalCost;
  }
}
