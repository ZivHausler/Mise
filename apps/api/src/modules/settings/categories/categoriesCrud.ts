import { PgCategoriesRepository, type RecipeCategory } from './categories.repository.js';

export class CategoriesCrud {
  static async create(storeId: number, name: string, nameEn?: string | null): Promise<RecipeCategory> {
    return PgCategoriesRepository.create(storeId, name, nameEn);
  }

  static async getById(id: number, storeId: number): Promise<RecipeCategory | null> {
    return PgCategoriesRepository.findById(id, storeId);
  }

  static async getAll(storeId: number): Promise<RecipeCategory[]> {
    return PgCategoriesRepository.findAll(storeId);
  }

  static async update(id: number, storeId: number, name: string, nameEn?: string | null): Promise<RecipeCategory> {
    return PgCategoriesRepository.update(id, storeId, name, nameEn);
  }

  static async delete(id: number, storeId: number): Promise<void> {
    await PgCategoriesRepository.delete(id, storeId);
  }
}
