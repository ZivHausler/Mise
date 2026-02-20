import { z } from 'zod';

export const adjustLoyaltySchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().int().refine((v) => v !== 0, { message: 'Points must be nonzero' }),
  description: z.string().max(500).optional(),
});

export const redeemLoyaltySchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().int().positive(),
});

export const updateLoyaltyConfigSchema = z.object({
  isActive: z.boolean().optional(),
  pointsPerShekel: z.number().positive().max(1000).optional(),
  pointValue: z.number().positive().max(1000).optional(),
  minRedeemPoints: z.number().int().min(0).optional(),
});
