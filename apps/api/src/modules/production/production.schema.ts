import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const getBatchesSchema = z.object({
  date: z.string().regex(dateRegex, 'Expected YYYY-MM-DD format'),
});

export const createBatchSchema = z.object({
  recipeId: z.string().max(100),
  recipeName: z.string().max(255).optional(),
  quantity: z.number().int().positive().max(100000),
  productionDate: z.string().regex(dateRegex, 'Expected YYYY-MM-DD format'),
  priority: z.number().int().min(0).max(4).optional(),
  assignedTo: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export const generateBatchesSchema = z.object({
  date: z.string().regex(dateRegex, 'Expected YYYY-MM-DD format'),
});

export const updateStageSchema = z.object({
  stage: z.number().int().min(0).max(6),
});

export const updateBatchSchema = z.object({
  quantity: z.number().int().positive().max(100000).optional(),
  priority: z.number().int().min(0).max(4).optional(),
  assignedTo: z.string().max(255).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const splitBatchSchema = z.object({
  splitQuantity: z.number().int().positive(),
});

export const mergeBatchesSchema = z.object({
  batchIds: z.array(z.coerce.number().int().positive()).min(2).max(50),
});

export const prepListDateSchema = z.object({
  date: z.string().regex(dateRegex, 'Expected YYYY-MM-DD format'),
});

export const togglePrepItemSchema = z.object({
  isPrepped: z.boolean(),
});
