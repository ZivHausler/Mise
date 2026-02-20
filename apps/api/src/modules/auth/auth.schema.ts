import { z } from 'zod';
export { loginSchema, registerSchema } from '@mise/shared/src/validation/index.js';

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

export const googleMergeSchema = z.object({
  credential: z.string().min(1),
  password: z.string().min(1),
});
