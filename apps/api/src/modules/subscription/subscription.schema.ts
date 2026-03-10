import { z } from 'zod';

export const changePlanSchema = z.object({
  planSlug: z.enum(['free', 'basic', 'pro']),
});

export const adminChangePlanSchema = z.object({
  planSlug: z.enum(['free', 'basic', 'pro']),
});

export const previewChangeQuerySchema = z.object({
  planSlug: z.enum(['free', 'basic', 'pro']),
});

export const paymentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
