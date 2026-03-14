import { z } from 'zod';

/** Reusable date string schema: validates YYYY-MM-DD format */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DATE_MUST_BE_YYYY_MM_DD');

export const loginSchema = z.object({
  email: z.string().email('INVALID_EMAIL_ADDRESS').max(255),
  password: z.string().min(8, 'PASSWORD_MIN_8_CHARACTERS').max(128),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'NAME_MIN_2_CHARACTERS').max(100),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'NAME_REQUIRED').max(200),
  phone: z.string().max(50).optional(),
  email: z.string().email('INVALID_EMAIL_ADDRESS').max(255).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const createIngredientSchema = z.object({
  name: z.string().min(1, 'NAME_REQUIRED').max(200),
  unit: z.string().min(1, 'UNIT_REQUIRED').max(50),
  quantity: z.number().min(0, 'QUANTITY_MUST_BE_NON_NEGATIVE'),
  costPerUnit: z.number().min(0, 'COST_MUST_BE_NON_NEGATIVE'),
  lowStockThreshold: z.number().min(0, 'THRESHOLD_MUST_BE_NON_NEGATIVE'),
  supplier: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
