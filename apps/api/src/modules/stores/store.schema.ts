import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().trim().min(1, 'Store name is required').max(255),
  code: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.number().int().min(2).max(3).default(3),
});
