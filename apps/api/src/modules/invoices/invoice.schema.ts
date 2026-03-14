import { z } from 'zod';
import { dateStringSchema } from '@mise/shared';

export const createInvoiceSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  notes: z.string().max(2000).optional(),
});

export const createCreditNoteSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  type: z.enum(['invoice', 'credit_note']).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  search: z.string().max(200).optional(),
});
