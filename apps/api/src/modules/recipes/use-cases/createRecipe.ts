import type { IRecipeRepository } from '../recipe.repository.js';
import type { CreateRecipeDTO, Recipe } from '../recipe.types.js';
import { ValidationError } from '../../../core/errors/app-error.js';

export class CreateRecipeUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

  async execute(data: CreateRecipeDTO): Promise<Recipe> {
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
    return this.recipeRepository.create(data);
  }
}
