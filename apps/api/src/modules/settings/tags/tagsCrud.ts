import { PgTagsRepository, type RecipeTag } from './tags.repository.js';

export class TagsCrud {
  static async create(storeId: number, name: string): Promise<RecipeTag> {
    return PgTagsRepository.create(storeId, name);
  }

  static async getById(id: number, storeId: number): Promise<RecipeTag | null> {
    return PgTagsRepository.findById(id, storeId);
  }

  static async getAll(storeId: number): Promise<RecipeTag[]> {
    return PgTagsRepository.findAll(storeId);
  }

  static async update(id: number, storeId: number, name: string): Promise<RecipeTag> {
    return PgTagsRepository.update(id, storeId, name);
  }

  static async delete(id: number, storeId: number): Promise<void> {
    await PgTagsRepository.delete(id, storeId);
  }
}
