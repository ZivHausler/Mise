import type { IRecipeRepository } from './recipe.repository.js';
import type { CreateRecipeDTO, Recipe, UpdateRecipeDTO } from './recipe.types.js';
import type { EventBus } from '../../core/events/event-bus.js';
import { CreateRecipeUseCase } from './use-cases/createRecipe.js';
import { UpdateRecipeUseCase } from './use-cases/updateRecipe.js';
import { DeleteRecipeUseCase } from './use-cases/deleteRecipe.js';
import { CalculateRecipeCostUseCase } from './use-cases/calculateRecipeCost.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import type { InventoryService } from '../inventory/inventory.service.js';
import { unitConversionFactor } from '../shared/unitConversion.js';

export class RecipeService {
  private createRecipeUseCase: CreateRecipeUseCase;
  private updateRecipeUseCase: UpdateRecipeUseCase;
  private deleteRecipeUseCase: DeleteRecipeUseCase;
  private calculateCostUseCase: CalculateRecipeCostUseCase;

  constructor(
    private recipeRepository: IRecipeRepository,
    private eventBus: EventBus,
    private inventoryService?: InventoryService,
  ) {
    this.createRecipeUseCase = new CreateRecipeUseCase(recipeRepository);
    this.updateRecipeUseCase = new UpdateRecipeUseCase(recipeRepository);
    this.deleteRecipeUseCase = new DeleteRecipeUseCase(recipeRepository);
    this.calculateCostUseCase = new CalculateRecipeCostUseCase(recipeRepository, inventoryService);
  }

  async getById(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) throw new NotFoundError('Recipe not found');
    await this.enrichIngredients(recipe);
    await this.enrichSubRecipeSteps(recipe);
    return recipe;
  }

  async getAll(filters?: { category?: string; search?: string }): Promise<Recipe[]> {
    const recipes = await this.recipeRepository.findAll(filters);
    for (const recipe of recipes) {
      await this.enrichIngredients(recipe);
    }
    return recipes;
  }

  private async enrichIngredients(recipe: Recipe): Promise<void> {
    if (!this.inventoryService || !recipe.ingredients) return;
    let totalCost = 0;
    const groupsMap = new Map<string, { id: string; name: string; color: string | null; icon: string | null }>();
    for (const ing of recipe.ingredients) {
      try {
        const item = await this.inventoryService.getById(ing.ingredientId);
        ing.name = item.name;
        const factor = unitConversionFactor(ing.unit, item.unit);
        const convertedQty = ing.quantity * factor;
        ing.costPerUnit = item.costPerUnit;
        (ing as any).totalCost = +(convertedQty * item.costPerUnit).toFixed(2);
        totalCost += (ing as any).totalCost;
        for (const g of item.groups ?? []) {
          if (!groupsMap.has(g.id)) groupsMap.set(g.id, { id: g.id, name: g.name, color: g.color, icon: g.icon });
        }
      } catch {
        ing.name = ing.name ?? 'Unknown';
        ing.costPerUnit = ing.costPerUnit ?? 0;
        (ing as any).totalCost = 0;
      }
    }
    recipe.totalCost = +totalCost.toFixed(2);
    recipe.costPerUnit = recipe.yield ? +(totalCost / recipe.yield).toFixed(2) : totalCost;
    (recipe as any).groups = Array.from(groupsMap.values());
  }

  private async enrichSubRecipeSteps(recipe: Recipe): Promise<void> {
    if (!recipe.steps) return;
    for (const step of recipe.steps) {
      if (step.type !== 'sub_recipe' || !step.recipeId) continue;
      try {
        const subRecipe = await this.recipeRepository.findById(step.recipeId);
        if (subRecipe) {
          step.name = subRecipe.name;
          await this.enrichIngredients(subRecipe);
          const qty = step.quantity ?? 1;
          // Multiply ingredient amounts and costs by sub-recipe quantity
          (step as any).ingredients = subRecipe.ingredients.map((ing) => ({
            ...ing,
            quantity: +(ing.quantity * qty).toFixed(4),
            totalCost: +((ing as any).totalCost * qty).toFixed(2),
          }));
          (step as any).subSteps = subRecipe.steps;
          (step as any).totalCost = +((subRecipe.totalCost ?? 0) * qty).toFixed(2);
        }
      } catch {
        // skip if sub-recipe not found
      }
    }
  }

  async create(data: CreateRecipeDTO): Promise<Recipe> {
    // Enrich ingredients with names and costs from inventory
    if (this.inventoryService && data.ingredients) {
      for (const ing of data.ingredients) {
        try {
          const inventoryItem = await this.inventoryService.getById(ing.ingredientId);
          (ing as any).name = inventoryItem.name;
          (ing as any).costPerUnit = inventoryItem.costPerUnit;
        } catch {
          (ing as any).name = (ing as any).name ?? 'Unknown';
          (ing as any).costPerUnit = (ing as any).costPerUnit ?? 0;
        }
      }
    }

    // Enrich sub-recipe steps with names
    if (data.steps) {
      for (const step of data.steps) {
        if (step.type !== 'sub_recipe' || !step.recipeId) continue;
        try {
          const subRecipe = await this.recipeRepository.findById(step.recipeId);
          if (subRecipe) step.name = subRecipe.name;
        } catch {
          step.name = step.name ?? 'Unknown';
        }
      }
    }

    const recipe = await this.createRecipeUseCase.execute(data);

    // Calculate and update cost
    const totalCost = await this.calculateCostUseCase.execute(recipe.id);
    const costPerUnit = recipe.yield ? totalCost / recipe.yield : totalCost;
    await this.recipeRepository.update(recipe.id, { ...data, } as any);
    // Update the cost fields directly
    const updated = await this.recipeRepository.update(recipe.id, {} as any);
    // We need to set totalCost and costPerUnit on the doc
    const finalRecipe = await this.recipeRepository.findById(recipe.id);

    return finalRecipe ?? recipe;
  }

  async update(id: string, data: UpdateRecipeDTO): Promise<Recipe> {
    // Enrich ingredients with names and costs from inventory
    if (this.inventoryService && data.ingredients) {
      for (const ing of data.ingredients) {
        try {
          const inventoryItem = await this.inventoryService.getById(ing.ingredientId);
          (ing as any).name = inventoryItem.name;
          (ing as any).costPerUnit = inventoryItem.costPerUnit;
        } catch {
          (ing as any).name = (ing as any).name ?? 'Unknown';
          (ing as any).costPerUnit = (ing as any).costPerUnit ?? 0;
        }
      }
    }

    // Enrich sub-recipe steps with names
    if (data.steps) {
      for (const step of data.steps) {
        if (step.type !== 'sub_recipe' || !step.recipeId) continue;
        try {
          const subRecipe = await this.recipeRepository.findById(step.recipeId);
          if (subRecipe) step.name = subRecipe.name;
        } catch {
          step.name = step.name ?? 'Unknown';
        }
      }
    }

    const recipe = await this.updateRecipeUseCase.execute(id, data);

    // Recalculate cost
    const totalCost = await this.calculateCostUseCase.execute(recipe.id);
    const costPerUnit = recipe.yield ? totalCost / recipe.yield : totalCost;
    await this.recipeRepository.update(recipe.id, { totalCost, costPerUnit } as any);

    await this.eventBus.publish({
      eventName: 'recipe.updated',
      payload: { recipeId: recipe.id },
      timestamp: new Date(),
    });

    const updated = await this.recipeRepository.findById(recipe.id);
    return updated ?? recipe;
  }

  async calculateCost(id: string): Promise<{ totalCost: number; costPerUnit: number }> {
    const recipe = await this.getById(id);
    const totalCost = await this.calculateCostUseCase.execute(id);
    const costPerUnit = recipe.yield ? totalCost / recipe.yield : totalCost;

    await this.recipeRepository.update(id, { totalCost, costPerUnit } as any);

    return { totalCost, costPerUnit };
  }

  async delete(id: string): Promise<void> {
    return this.deleteRecipeUseCase.execute(id);
  }
}
