import { z } from 'zod';
import { InventoryLogType } from '@mise/shared';

export const createIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(50),
  quantity: z.number().min(0).max(1000000),
  costPerUnit: z.number().min(0).max(1000000),
  packageSize: z.number().min(0).max(1000000).optional(),
  lowStockThreshold: z.number().min(0).max(1000000),
  supplier: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const adjustStockSchema = z.object({
  ingredientId: z.string().uuid(),
  type: z.nativeEnum(InventoryLogType),
  quantity: z.number().positive().max(1000000),
  reason: z.string().max(500).optional(),
  pricePaid: z.number().min(0).max(1000000).optional(),
});
