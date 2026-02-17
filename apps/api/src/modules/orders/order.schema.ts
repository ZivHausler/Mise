import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    recipeId: z.string().max(100),
    recipeName: z.string().max(200).optional(),
    quantity: z.number().int().positive().max(10000),
    price: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })).min(1).max(100),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional().transform((v) => v ? new Date(v) : undefined),
});

export const updateOrderStatusSchema = z.object({
  status: z.number().int().min(0).max(3),
});

export const updateOrderSchema = z.object({
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional().transform((v) => v ? new Date(v) : undefined),
});
