import type { RecipeCategory } from './categories.repository.js';
import { CategoriesCrud } from './categoriesCrud.js';
import { NotFoundError } from '../../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class CategoriesService {
  async listCategories(storeId: number): Promise<RecipeCategory[]> {
    return CategoriesCrud.getAll(storeId);
  }

  async createCategory(storeId: number, name: string, nameEn?: string | null): Promise<RecipeCategory> {
    return CategoriesCrud.create(storeId, name, nameEn);
  }

  async updateCategory(categoryId: number, storeId: number, name: string, nameEn?: string | null): Promise<RecipeCategory> {
    const category = await CategoriesCrud.getById(categoryId, storeId);
    if (!category) throw new NotFoundError('Category not found', ErrorCode.CATEGORY_NOT_FOUND);
    return CategoriesCrud.update(categoryId, storeId, name, nameEn);
  }

  async deleteCategory(categoryId: number, storeId: number): Promise<void> {
    const category = await CategoriesCrud.getById(categoryId, storeId);
    if (!category) throw new NotFoundError('Category not found', ErrorCode.CATEGORY_NOT_FOUND);
    return CategoriesCrud.delete(categoryId, storeId);
  }
}
