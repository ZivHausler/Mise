import type { IRecipeRepository } from '../recipe.repository.js';
import type { UpdateRecipeDTO, Recipe } from '../recipe.types.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class UpdateRecipeUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

  async execute(id: string, data: UpdateRecipeDTO): Promise<Recipe> {
    const existing = await this.recipeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Recipe not found');
    }
    return this.recipeRepository.update(id, data);
  }
}
