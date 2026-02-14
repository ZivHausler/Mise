export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  ingredients: RecipeIngredient[];
  subRecipes?: SubRecipeReference[];
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

export interface SubRecipeReference {
  recipeId: string;
  name: string;
  quantity: number;
}

export interface RecipeStep {
  order: number;
  instruction: string;
  duration?: number; // minutes
  notes?: string;
}

export interface CreateRecipeDTO {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  ingredients: Omit<RecipeIngredient, 'name' | 'costPerUnit'>[];
  subRecipes?: Omit<SubRecipeReference, 'name'>[];
  steps: RecipeStep[];
  yield?: number;
  yieldUnit?: string;
  sellingPrice?: number;
  notes?: string;
  variations?: string[];
}

export interface UpdateRecipeDTO extends Partial<CreateRecipeDTO> {}
