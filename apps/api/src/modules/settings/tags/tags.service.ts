import type { RecipeTag } from './tags.repository.js';
import { TagsCrud } from './tagsCrud.js';
import { NotFoundError } from '../../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class TagsService {
  async listTags(storeId: number): Promise<RecipeTag[]> {
    return TagsCrud.getAll(storeId);
  }

  async createTag(storeId: number, name: string): Promise<RecipeTag> {
    return TagsCrud.create(storeId, name);
  }

  async updateTag(tagId: number, storeId: number, name: string): Promise<RecipeTag> {
    const tag = await TagsCrud.getById(tagId, storeId);
    if (!tag) throw new NotFoundError('Tag not found', ErrorCode.TAG_NOT_FOUND);
    return TagsCrud.update(tagId, storeId, name);
  }

  async deleteTag(tagId: number, storeId: number): Promise<void> {
    const tag = await TagsCrud.getById(tagId, storeId);
    if (!tag) throw new NotFoundError('Tag not found', ErrorCode.TAG_NOT_FOUND);
    return TagsCrud.delete(tagId, storeId);
  }
}
