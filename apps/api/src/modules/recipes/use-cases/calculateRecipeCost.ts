import type { IRecipeRepository } from '../recipe.repository.js';
import type { Recipe } from '../recipe.types.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class CalculateRecipeCostUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

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
      totalCost += (ingredient.costPerUnit ?? 0) * ingredient.quantity;
    }

    // Cost from sub-recipes (recursive)
    if (recipe.subRecipes) {
      for (const subRef of recipe.subRecipes) {
        const subCost = await this.execute(subRef.recipeId, visited);
        totalCost += subCost * subRef.quantity;
      }
    }

    return totalCost;
  }
}
