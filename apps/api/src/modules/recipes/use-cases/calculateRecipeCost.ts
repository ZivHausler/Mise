import type { IRecipeRepository } from '../recipe.repository.js';
import type { Recipe } from '../recipe.types.js';
import type { InventoryService } from '../../inventory/inventory.service.js';
import { NotFoundError } from '../../../core/errors/app-error.js';
import { unitConversionFactor } from '../../shared/unitConversion.js';

export class CalculateRecipeCostUseCase {
  constructor(
    private recipeRepository: IRecipeRepository,
    private inventoryService?: InventoryService,
  ) {}

  async execute(recipeId: string, visited = new Set<string>()): Promise<number> {
    if (visited.has(recipeId)) {
      return 0; // Prevent circular references
    }
    visited.add(recipeId);

    const recipe = await this.recipeRepository.findById(recipeId);
    if (!recipe) {
      throw new NotFoundError(`Recipe ${recipeId} not found`);
    }

    let totalCost = 0;

    // Cost from direct ingredients
    for (const ingredient of recipe.ingredients) {
      let costPerUnit = ingredient.costPerUnit ?? 0;
      let factor = 1;

      if (this.inventoryService) {
        try {
          const item = await this.inventoryService.getById(ingredient.ingredientId);
          costPerUnit = item.costPerUnit;
          factor = unitConversionFactor(ingredient.unit, item.unit);
        } catch {
          // use stored costPerUnit if inventory item not found
        }
      }

      totalCost += costPerUnit * ingredient.quantity * factor;
    }

    // Cost from sub-recipe steps (recursive)
    for (const step of recipe.steps) {
      if (step.type === 'sub_recipe' && step.recipeId) {
        const subCost = await this.execute(step.recipeId, visited);
        totalCost += subCost * (step.quantity ?? 1);
      }
    }

    return totalCost;
  }
}
