import { z } from 'zod';
import { STORE_CATEGORY_SUBJECT_KEYS, STORE_CATEGORY_MAP } from '@mise/shared';

export const createStoreSchema = z.object({
  name: z.string().trim().min(1, 'STORE_NAME_REQUIRED').max(255),
  nameEn: z.string().trim().max(255).optional(),
  code: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
  addressEn: z.string().trim().max(500).optional(),
});

export const updateThemeSchema = z.object({
  theme: z.enum(['cream', 'white', 'stone', 'rose', 'mint', 'sky', 'lavender']).optional(),
  applyThemeToApp: z.boolean().optional(),
}).refine(
  (data) => data.theme !== undefined || data.applyThemeToApp !== undefined,
  { message: 'AT_LEAST_ONE_FIELD_REQUIRED' },
);

export const updateBusinessInfoSchema = z.object({
  name: z.string().trim().min(1).max(255).nullable().optional(),
  nameEn: z.string().trim().max(255).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  addressEn: z.string().trim().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email('INVALID_EMAIL_ADDRESS').max(255).nullable().optional(),
  taxNumber: z.string().regex(/^\d{9}$/, 'TAX_NUMBER_MUST_BE_EXACTLY_9_DIGITS').nullable().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  autoGenerateInvoice: z.boolean().optional(),
  autoGenerateCreditNote: z.boolean().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email('INVALID_EMAIL_ADDRESS'),
  role: z.number().int().min(2).max(3).default(3),
});

export const updateSlugSchema = z.object({
  slug: z.string().trim().min(3).max(100).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'SLUG_INVALID_FORMAT'),
});

export const updateStorefrontEnabledSchema = z.object({
  enabled: z.boolean(),
});

export const checkSlugSchema = z.object({
  slug: z.string().trim().min(3).max(100),
});

export const brandingUploadUrlSchema = z.object({
  type: z.enum(['logo', 'banner']),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export const updateBrandingSchema = z.object({
  logoUrl: z.string().max(2000).nullable().optional(),
  bannerUrl: z.string().max(2000).nullable().optional(),
  description: z.string().trim().max(500).transform(val => val ? val.replace(/<[^>]*>/g, '') : val).nullable().optional(),
  descriptionEn: z.string().trim().max(500).transform(val => val ? val.replace(/<[^>]*>/g, '') : val).nullable().optional(),
  categorySubject: z.string().nullable().optional(),
  categorySubSubject: z.string().nullable().optional(),
}).refine(
  (data) => data.logoUrl !== undefined || data.bannerUrl !== undefined || data.description !== undefined || data.descriptionEn !== undefined || data.categorySubject !== undefined || data.categorySubSubject !== undefined,
  { message: 'AT_LEAST_ONE_FIELD_REQUIRED' },
).refine(
  (data) => {
    if (data.categorySubject === undefined) return true;
    if (data.categorySubject === null) return true;
    return STORE_CATEGORY_SUBJECT_KEYS.includes(data.categorySubject);
  },
  { message: 'INVALID_CATEGORY_SUBJECT' },
).refine(
  (data) => {
    if (data.categorySubSubject === undefined) return true;
    if (data.categorySubSubject === null) return true;
    // Sub-subject requires a valid subject
    const subject = data.categorySubject;
    if (!subject) return false;
    const validSubs = STORE_CATEGORY_MAP[subject];
    if (!validSubs) return false;
    return validSubs.includes(data.categorySubSubject);
  },
  { message: 'INVALID_CATEGORY_SUB_SUBJECT' },
).refine(
  (data) => {
    // If subject is cleared (null), sub-subject must also be cleared
    if (data.categorySubject === null && data.categorySubSubject !== undefined && data.categorySubSubject !== null) {
      return false;
    }
    return true;
  },
  { message: 'CATEGORY_SUB_SUBJECT_REQUIRES_SUBJECT' },
);
