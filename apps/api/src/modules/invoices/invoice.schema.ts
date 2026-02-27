import { z } from 'zod';

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
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format').optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format').optional(),
  search: z.string().max(200).optional(),
});
