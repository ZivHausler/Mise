export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  yield?: number;
  yieldUnit?: string;
  costPerUnit?: number;
  totalCost?: number;
  sellingPrice?: number;
  photos?: string[];
  notes?: string;
  variations?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
}

export interface RecipeStep {
  order: number;
  type: 'step' | 'sub_recipe';
  instruction?: string;
  duration?: number; // minutes
  notes?: string;
  recipeId?: string;
  name?: string;
  quantity?: number;
}

export interface CreateRecipeDTO {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  ingredients: Omit<RecipeIngredient, 'name' | 'costPerUnit'>[];
  steps: RecipeStep[];
  yield?: number;
  yieldUnit?: string;
  sellingPrice?: number;
  notes?: string;
  variations?: string[];
  photos?: string[];
}

export interface UpdateRecipeDTO extends Partial<CreateRecipeDTO> {}
