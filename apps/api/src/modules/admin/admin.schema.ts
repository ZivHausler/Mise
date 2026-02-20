import { z } from 'zod';

export const toggleAdminSchema = z.object({
  userId: z.string().uuid(),
});

export const toggleDisabledSchema = z.object({
  userId: z.string().uuid(),
});

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.number().int().min(-1).max(3).optional(),
});

export const auditLogFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  userId: z.string().uuid().optional(),
  method: z.string().optional(),
  statusCode: z.coerce.number().int().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
