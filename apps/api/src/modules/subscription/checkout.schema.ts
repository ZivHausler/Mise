import { z } from 'zod';

export const initiateCheckoutSchema = z.object({
  planSlug: z.enum(['basic', 'pro']),
});

export const checkoutStatusParamsSchema = z.object({
  id: z.string().uuid(),
});

export const trialDowngradeSchema = z.object({
  planSlug: z.enum(['free', 'basic', 'pro']),
});
