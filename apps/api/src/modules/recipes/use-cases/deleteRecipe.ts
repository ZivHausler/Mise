import type { IRecipeRepository } from '../recipe.repository.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class DeleteRecipeUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.recipeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Recipe not found');
    }
    return this.recipeRepository.delete(id);
  }
}
