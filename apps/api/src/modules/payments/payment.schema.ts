import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  amount: z.number().positive().max(10000000),
  method: z.enum(['cash']),
  notes: z.string().max(1000).optional(),
});
