import { z } from 'zod';

export const adjustLoyaltySchema = z.object({
  customerId: z.coerce.number().int().positive(),
  points: z.number().int().refine((v) => v !== 0, { message: 'Points must be nonzero' }),
  description: z.string().max(500).optional(),
});

export const redeemLoyaltySchema = z.object({
  customerId: z.coerce.number().int().positive(),
  points: z.number().int().positive(),
});

export const updateLoyaltyConfigSchema = z.object({
  isActive: z.boolean().optional(),
  pointsPerShekel: z.number().positive().max(1000).optional(),
  pointValue: z.number().positive().max(1000).optional(),
  minRedeemPoints: z.number().int().min(0).optional(),
  segmentVipOrderCount: z.number().int().min(1).max(1000).optional(),
  segmentVipDays: z.number().int().min(1).max(365).optional(),
  segmentRegularOrderCount: z.number().int().min(1).max(1000).optional(),
  segmentRegularDays: z.number().int().min(1).max(365).optional(),
  segmentNewDays: z.number().int().min(1).max(365).optional(),
  segmentDormantDays: z.number().int().min(1).max(365).optional(),
  birthdayReminderDays: z.number().int().min(1).max(90).optional(),
});

export const segmentFilterSchema = z.enum(['vip', 'regular', 'new', 'dormant', 'inactive']).optional();
