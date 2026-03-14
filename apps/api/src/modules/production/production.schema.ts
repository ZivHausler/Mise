import { z } from 'zod';
import { dateStringSchema } from '@mise/shared';

export const getBatchesSchema = z.object({
  date: dateStringSchema,
});

export const createBatchSchema = z.object({
  recipeId: z.string().max(100),
  recipeName: z.string().max(255).optional(),
  quantity: z.number().int().positive().max(100000),
  productionDate: dateStringSchema,
  priority: z.number().int().min(0).max(4).optional(),
  assignedTo: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export const generateBatchesSchema = z.object({
  date: dateStringSchema,
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
  date: dateStringSchema,
});

export const togglePrepItemSchema = z.object({
  isPrepped: z.boolean(),
});
