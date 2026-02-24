import { z } from 'zod';

const instructionStepSchema = z.object({
  order: z.number().int().positive().max(1000),
  type: z.literal('step'),
  instruction: z.string().min(1).max(5000),
  duration: z.number().max(100000).optional(),
  notes: z.string().max(2000).optional(),
});

const subRecipeStepSchema = z.object({
  order: z.number().int().positive().max(1000),
  type: z.literal('sub_recipe'),
  recipeId: z.string().min(1).max(100),
  quantity: z.number().positive().max(1000000),
});

const recipeStepSchema = z.discriminatedUnion('type', [
  instructionStepSchema,
  subRecipeStepSchema,
]);

export const createRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required').max(200),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  ingredients: z.array(z.object({
    ingredientId: z.string().max(100),
    quantity: z.number().positive().max(1000000),
    unit: z.string().max(50),
  })).max(100),
  steps: z.array(recipeStepSchema).min(1).max(200),
  yield: z.number().positive().max(1000000).optional(),
  yieldUnit: z.string().max(50).optional(),
  sellingPrice: z.number().min(0).max(1000000).optional(),
  notes: z.string().max(5000).optional(),
  variations: z.array(z.string().max(1000)).max(20).optional(),
  photos: z.array(z.string().max(2000)).max(3).optional(),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const uploadUrlsSchema = z.object({
  count: z.number().int().min(1).max(3),
  mimeTypes: z.array(z.enum(['image/jpeg', 'image/png', 'image/webp'])).min(1).max(3),
});

export const deleteImageSchema = z.object({
  url: z.string().min(1),
});
