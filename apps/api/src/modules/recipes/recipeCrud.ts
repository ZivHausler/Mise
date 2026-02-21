import { MongoRecipeRepository } from './recipe.repository.js';
import type { CreateRecipeDTO, Recipe, UpdateRecipeDTO } from './recipe.types.js';

export class RecipeCrud {
  static async create(storeId: number, data: CreateRecipeDTO): Promise<Recipe> {
    return MongoRecipeRepository.create(storeId, data);
  }

  static async getById(storeId: number, id: string): Promise<Recipe | null> {
    return MongoRecipeRepository.findById(storeId, id);
  }

  static async getAll(storeId: number, filters?: { category?: string; search?: string }): Promise<Recipe[]> {
    return MongoRecipeRepository.findAll(storeId, filters);
  }

  static async update(storeId: number, id: string, data: UpdateRecipeDTO): Promise<Recipe> {
    return MongoRecipeRepository.update(storeId, id, data);
  }

  static async delete(storeId: number, id: string): Promise<void> {
    return MongoRecipeRepository.delete(storeId, id);
  }
}
