import { MongoRecipeRepository } from './recipe.repository.js';
import type { CreateRecipeDTO, Recipe, UpdateRecipeDTO } from './recipe.types.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';

export class RecipeCrud {
  static async create(storeId: string, data: CreateRecipeDTO): Promise<Recipe> {
    if (!data.name.trim()) {
      throw new ValidationError('Recipe name is required');
    }
    if (!data.steps || data.steps.length === 0) {
      throw new ValidationError('At least one step is required');
    }
    for (const step of data.steps) {
      if (step.type === 'step' && (!step.instruction || !step.instruction.trim())) {
        throw new ValidationError(`Step ${step.order} must have an instruction`);
      }
      if (step.type === 'sub_recipe' && !step.recipeId) {
        throw new ValidationError(`Step ${step.order} must reference a recipe`);
      }
    }
    return MongoRecipeRepository.create(storeId, data);
  }

  static async getById(storeId: string, id: string): Promise<Recipe | null> {
    return MongoRecipeRepository.findById(storeId, id);
  }

  static async getAll(storeId: string, filters?: { category?: string; search?: string }): Promise<Recipe[]> {
    return MongoRecipeRepository.findAll(storeId, filters);
  }

  static async update(storeId: string, id: string, data: UpdateRecipeDTO): Promise<Recipe> {
    const existing = await MongoRecipeRepository.findById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Recipe not found');
    }
    return MongoRecipeRepository.update(storeId, id, data);
  }

  static async delete(storeId: string, id: string): Promise<void> {
    const existing = await MongoRecipeRepository.findById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Recipe not found');
    }
    return MongoRecipeRepository.delete(storeId, id);
  }
}
