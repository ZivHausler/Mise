import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const createIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  unit: z.string().min(1, 'Unit is required').max(50),
  quantity: z.number().min(0, 'Quantity must be non-negative'),
  costPerUnit: z.number().min(0, 'Cost must be non-negative'),
  lowStockThreshold: z.number().min(0, 'Threshold must be non-negative'),
  supplier: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
