import type { IRecipeRepository } from './recipe.repository.js';
import type { CreateRecipeDTO, Recipe, UpdateRecipeDTO } from './recipe.types.js';
import type { EventBus } from '../../core/events/event-bus.js';
import { CreateRecipeUseCase } from './use-cases/createRecipe.js';
import { UpdateRecipeUseCase } from './use-cases/updateRecipe.js';
import { DeleteRecipeUseCase } from './use-cases/deleteRecipe.js';
import { CalculateRecipeCostUseCase } from './use-cases/calculateRecipeCost.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import type { InventoryService } from '../inventory/inventory.service.js';

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
    this.calculateCostUseCase = new CalculateRecipeCostUseCase(recipeRepository);
  }

  async getById(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) throw new NotFoundError('Recipe not found');
    return recipe;
  }

  async getAll(filters?: { category?: string; search?: string }): Promise<Recipe[]> {
    return this.recipeRepository.findAll(filters);
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

    // Enrich sub-recipe references with names
    if (data.subRecipes) {
      for (const sub of data.subRecipes) {
        try {
          const subRecipe = await this.recipeRepository.findById(sub.recipeId);
          if (subRecipe) (sub as any).name = subRecipe.name;
        } catch {
          (sub as any).name = (sub as any).name ?? 'Unknown';
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
