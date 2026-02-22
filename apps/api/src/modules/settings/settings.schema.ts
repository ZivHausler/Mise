import { z } from 'zod';
import { Language } from '@mise/shared';

// ─── Units ──────────────────────────────────────────────────────────────────

export const createUnitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  abbreviation: z.string().trim().min(1).max(20),
  categoryId: z.coerce.number().int().positive(),
  conversionFactor: z.number().positive(),
});

export type CreateUnitDTO = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  abbreviation: z.string().trim().min(1).max(20).optional(),
  conversionFactor: z.number().positive().optional(),
});

export type UpdateUnitDTO = z.infer<typeof updateUnitSchema>;

// ─── Groups ─────────────────────────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(200),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type CreateGroupDTO = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

export type UpdateGroupDTO = z.infer<typeof updateGroupSchema>;

// ─── Profile ────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  phone: z.string().regex(/^05\d{8}$/, 'Invalid phone number — e.g. 0541234567').optional().nullable(),
  language: z.nativeEnum(Language).optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;

// ─── Notifications ──────────────────────────────────────────────────────────

export const NOTIFICATION_EVENT_TYPES = [
  'order_created',
  'low_stock',
  'payment_received',
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const notificationPrefItemSchema = z.object({
  eventType: z.enum(NOTIFICATION_EVENT_TYPES),
  email: z.boolean(),
  push: z.boolean(),
  sms: z.boolean(),
});

export const updateNotificationPrefsSchema = z.object({
  preferences: z.array(notificationPrefItemSchema).min(1),
});

export type UpdateNotificationPrefsDTO = z.infer<typeof updateNotificationPrefsSchema>;
