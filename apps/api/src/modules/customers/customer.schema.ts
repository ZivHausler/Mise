import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().min(1, 'Phone number is required').max(50),
  email: z.union([z.string().email().max(255), z.literal('')]).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  preferences: z.object({
    allergies: z.array(z.string().max(100)).max(50).optional(),
    favorites: z.array(z.string().max(100)).max(50).optional(),
  }).optional(),
  birthday: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthday must be YYYY-MM-DD')
    .refine((val) => !isNaN(new Date(val).getTime()), 'Invalid date')
    .nullable()
    .optional(),
  loyaltyEnabled: z.boolean().optional(),
  loyaltyTier: z.enum(['bronze', 'silver', 'gold']).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
