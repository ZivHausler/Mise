import { z } from 'zod';
export { loginSchema, registerSchema } from '@mise/shared/src/validation/index.js';

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

export const googleMergeSchema = z.object({
  credential: z.string().min(1),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('INVALID_EMAIL_ADDRESS'),
});

export const resetPasswordSchema = z.object({
  token: z.string().length(64),
  newPassword: z.string().min(8).max(128),
});
