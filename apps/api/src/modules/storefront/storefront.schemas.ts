import { z } from 'zod';

// -- Request schemas --

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'INVALID_STORE_SLUG'),
});

export const langQuerySchema = z.object({
  lang: z.enum(['he', 'en']).optional().default('he'),
});

export const menuQuerySchema = z.object({
  tag: z.string().optional(),
  search: z.string().max(100).optional(),
  lang: z.enum(['he', 'en']).optional().default('he'),
});

export const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(100).trim(),
    phone: z.string().min(9).max(15).regex(/^\+?[0-9]+$/, 'PHONE_INVALID_FORMAT'),
    email: z.string().email('INVALID_EMAIL_ADDRESS').optional().or(z.literal('')),
  }),
  items: z.array(z.object({
    recipeId: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
    notes: z.string().max(500).optional(),
  })).min(1).max(50),
  notes: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  paymentMethod: z.enum(['pay_at_pickup', 'paypal']),
  /** For PayPal: pass the paypalOrderId after customer approved payment */
  paypalOrderId: z.string().min(1).regex(/^[A-Z0-9]+$/i).optional(),
});

export const createPayPalOrderSchema = z.object({
  items: z.array(z.object({
    recipeId: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(50),
});

export const orderStatusQuerySchema = z.object({
  phone: z.string().min(9).max(15).regex(/^\+?[0-9]+$/),
});

export const capturePayPalOrderSchema = z.object({
  paypalOrderId: z.string().min(1),
  orderNumber: z.number().int().positive(),
});

export const recipeDetailParamSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'INVALID_STORE_SLUG'),
  recipeId: z.string().length(24).regex(/^[a-f0-9]+$/, 'INVALID_RECIPE_ID'),
});

export const orderStatusParamSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'INVALID_STORE_SLUG'),
  orderNumber: z.coerce.number().int().positive(),
});

export const checkoutQuerySchema = z.object({
  orderId: z.string().min(1).regex(/^[A-Z0-9]+$/i, 'INVALID_ORDER_ID_FORMAT'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'INVALID_AMOUNT_FORMAT'),
});

export const cancelOrderBodySchema = z.object({
  phone: z.string().min(9).max(15).regex(/^\+?[0-9]+$/),
  reason: z.string().max(1000).optional(),
});

export const notificationsQuerySchema = z.object({
  phone: z.string().min(9).max(15).regex(/^\+?[0-9]+$/),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().regex(/^[^<>]+$/, 'NAME_MUST_NOT_CONTAIN_SPECIAL_CHARS').optional(),
  lastName: z.string().min(1).max(100).trim().regex(/^[^<>]+$/, 'NAME_MUST_NOT_CONTAIN_SPECIAL_CHARS').optional(),
  phone: z.string().min(9).max(15).regex(/^\+?[\d\s\-()]+$/, 'PHONE_INVALID_FORMAT').optional(),
}).refine(data => data.firstName || data.lastName || data.phone, {
  message: 'AT_LEAST_ONE_FIELD_REQUIRED',
});

// -- Response types (imported from @mise/shared) --
export type {
  PublicStoreInfo,
  PublicMenuItem,
  PublicMenuItemDetail,
  PublicOrderConfirmation,
  PublicOrderStatus,
} from '@mise/shared';
