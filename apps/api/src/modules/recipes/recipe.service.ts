import type { CreateRecipeDTO, Recipe, UpdateRecipeDTO } from './recipe.types.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { RecipeCrud } from './recipeCrud.js';
import { CalculateRecipeCostUseCase } from './use-cases/calculateRecipeCost.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import type { InventoryService } from '../inventory/inventory.service.js';
import { unitConversionFactor } from '../shared/unitConversion.js';
import {
  movePhotosToRecipe,
  deleteImage,
  deleteRecipeImages,
  isTempUrl,
} from '../../core/storage/gcs.js';

export class RecipeService {
  private calculateCostUseCase: CalculateRecipeCostUseCase;

  constructor(private inventoryService?: InventoryService) {
    this.calculateCostUseCase = new CalculateRecipeCostUseCase(inventoryService);
  }

  async getById(storeId: number, id: string): Promise<Recipe> {
    const recipe = await RecipeCrud.getById(storeId, id);
    if (!recipe) throw new NotFoundError('Recipe not found');
    await this.enrichIngredients(storeId, recipe);
    await this.enrichSubRecipeSteps(storeId, recipe);
    return recipe;
  }

  async getAll(storeId: number, filters?: { tag?: string; search?: string }): Promise<Recipe[]> {
    const recipes = await RecipeCrud.getAll(storeId, filters);
    for (const recipe of recipes) {
      await this.enrichIngredients(storeId, recipe);
      await this.enrichSubRecipeSteps(storeId, recipe);
    }
    return recipes;
  }

  private async enrichIngredients(storeId: number, recipe: Recipe): Promise<void> {
    if (!this.inventoryService || !recipe.ingredients) return;
    let totalCost = 0;
    const allergensMap = new Map<string, { id: string; name: string; color: string | null; icon: string | null; isDefault: boolean }>();
    for (const ing of recipe.ingredients) {
      try {
        const item = await this.inventoryService.getById(storeId, Number(ing.ingredientId));
        ing.name = item.name;
        const factor = unitConversionFactor(ing.unit, item.unit);
        const convertedQty = ing.quantity * factor;
        ing.costPerUnit = item.costPerUnit;
        (ing as any).totalCost = +(convertedQty * item.costPerUnit).toFixed(2);
        totalCost += (ing as any).totalCost;
        for (const g of item.allergens ?? []) {
          const gid = String(g.id);
          if (!allergensMap.has(gid)) allergensMap.set(gid, { id: gid, name: g.name, color: g.color, icon: g.icon, isDefault: !!g.isDefault });
        }
      } catch {
        ing.name = ing.name ?? 'Unknown';
        ing.costPerUnit = ing.costPerUnit ?? 0;
        (ing as any).totalCost = 0;
      }
    }
    recipe.totalCost = +totalCost.toFixed(2);
    recipe.costPerUnit = recipe.yield ? +(totalCost / recipe.yield).toFixed(2) : totalCost;
    (recipe as any).allergens = Array.from(allergensMap.values());
  }

  private async enrichSubRecipeSteps(storeId: number, recipe: Recipe): Promise<void> {
    if (!recipe.steps) return;
    let subRecipeCost = 0;
    for (const step of recipe.steps) {
      if (step.type !== 'sub_recipe' || !step.recipeId) continue;
      try {
        const subRecipe = await RecipeCrud.getById(storeId, step.recipeId);
        if (subRecipe) {
          step.name = subRecipe.name;
          await this.enrichIngredients(storeId, subRecipe);
          const qty = step.quantity ?? 1;
          const scaledIngredients = subRecipe.ingredients.map((ing) => ({
            ...ing,
            quantity: +(ing.quantity * qty).toFixed(4),
            totalCost: +((ing as any).totalCost * qty).toFixed(2),
          }));
          (step as any).ingredients = scaledIngredients;
          (step as any).subSteps = subRecipe.steps;
          const stepCost = +scaledIngredients.reduce((sum: number, ing: any) => sum + (ing.totalCost ?? 0), 0).toFixed(2);
          (step as any).totalCost = stepCost;
          subRecipeCost += stepCost;
        }
      } catch {
        // skip if sub-recipe not found
      }
    }
    // Add sub-recipe costs to the recipe total (enrichIngredients only sets direct ingredient costs)
    if (subRecipeCost > 0) {
      recipe.totalCost = +((recipe.totalCost ?? 0) + subRecipeCost).toFixed(2);
      recipe.costPerUnit = recipe.yield ? +(recipe.totalCost / recipe.yield).toFixed(2) : recipe.totalCost;
    }
  }

  async create(storeId: number, data: CreateRecipeDTO): Promise<Recipe> {
    if (this.inventoryService && data.ingredients) {
      for (const ing of data.ingredients) {
        try {
          const inventoryItem = await this.inventoryService.getById(storeId, Number(ing.ingredientId));
          (ing as any).name = inventoryItem.name;
          (ing as any).costPerUnit = inventoryItem.costPerUnit;
        } catch {
          (ing as any).name = (ing as any).name ?? 'Unknown';
          (ing as any).costPerUnit = (ing as any).costPerUnit ?? 0;
        }
      }
    }

    if (data.steps) {
      for (const step of data.steps) {
        if (step.type !== 'sub_recipe' || !step.recipeId) continue;
        try {
          const subRecipe = await RecipeCrud.getById(storeId, step.recipeId);
          if (subRecipe) step.name = subRecipe.name;
        } catch {
          step.name = step.name ?? 'Unknown';
        }
      }
    }

    const recipe = await RecipeCrud.create(storeId, data);

    // Move temp photos to final location
    if (data.photos?.length) {
      const hasTempPhotos = data.photos.some(isTempUrl);
      if (hasTempPhotos) {
        const finalPhotos = await movePhotosToRecipe(storeId, recipe.id, data.photos);
        await RecipeCrud.update(storeId, recipe.id, { photos: finalPhotos } as any);
      }
    }

    const totalCost = await this.calculateCostUseCase.execute(storeId, recipe.id);
    const costPerUnit = recipe.yield ? totalCost / recipe.yield : totalCost;
    await RecipeCrud.update(storeId, recipe.id, { totalCost, costPerUnit } as any);
    const finalRecipe = await RecipeCrud.getById(storeId, recipe.id);

    return finalRecipe ?? recipe;
  }

  async update(storeId: number, id: string, data: UpdateRecipeDTO): Promise<Recipe> {
    const existing = await RecipeCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Recipe not found');

    if (this.inventoryService && data.ingredients) {
      for (const ing of data.ingredients) {
        try {
          const inventoryItem = await this.inventoryService.getById(storeId, Number(ing.ingredientId));
          (ing as any).name = inventoryItem.name;
          (ing as any).costPerUnit = inventoryItem.costPerUnit;
        } catch {
          (ing as any).name = (ing as any).name ?? 'Unknown';
          (ing as any).costPerUnit = (ing as any).costPerUnit ?? 0;
        }
      }
    }

    if (data.steps) {
      for (const step of data.steps) {
        if (step.type !== 'sub_recipe' || !step.recipeId) continue;
        try {
          const subRecipe = await RecipeCrud.getById(storeId, step.recipeId);
          if (subRecipe) step.name = subRecipe.name;
        } catch {
          step.name = step.name ?? 'Unknown';
        }
      }
    }

    // Handle photo changes
    if (data.photos !== undefined) {
      // Move any temp photos to final location
      const hasTempPhotos = data.photos?.some(isTempUrl);
      if (hasTempPhotos && data.photos) {
        data.photos = await movePhotosToRecipe(storeId, id, data.photos);
      }
      // Delete removed photos from storage
      const oldPhotos = existing.photos ?? [];
      const newPhotos = data.photos ?? [];
      const removedPhotos = oldPhotos.filter((url) => !newPhotos.includes(url));
      await Promise.all(removedPhotos.map((url) => deleteImage(url)));
    }

    const recipe = await RecipeCrud.update(storeId, id, data);

    const totalCost = await this.calculateCostUseCase.execute(storeId, recipe.id);
    const costPerUnit = recipe.yield ? totalCost / recipe.yield : totalCost;
    await RecipeCrud.update(storeId, recipe.id, { totalCost, costPerUnit } as any);

    await getEventBus().publish({
      eventName: 'recipe.updated',
      payload: { recipeId: recipe.id },
      timestamp: new Date(),
    });

    const updated = await RecipeCrud.getById(storeId, recipe.id);
    return updated ?? recipe;
  }

  async calculateCost(storeId: number, id: string): Promise<{ totalCost: number; costPerUnit: number }> {
    const recipe = await this.getById(storeId, id);
    const totalCost = await this.calculateCostUseCase.execute(storeId, id);
    const costPerUnit = recipe.yield ? totalCost / recipe.yield : totalCost;

    await RecipeCrud.update(storeId, id, { totalCost, costPerUnit } as any);

    return { totalCost, costPerUnit };
  }

  async delete(storeId: number, id: string): Promise<void> {
    const existing = await RecipeCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Recipe not found');
    await deleteRecipeImages(storeId, id);
    return RecipeCrud.delete(storeId, id);
  }
}
