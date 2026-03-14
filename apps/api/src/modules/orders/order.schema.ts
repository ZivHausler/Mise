import { z } from 'zod';
import { MAX_RECURRING_OCCURRENCES, dateStringSchema } from '@mise/shared';

export const createOrderSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  items: z.array(z.object({
    recipeId: z.string().max(100),
    recipeName: z.string().max(200).optional(),
    quantity: z.number().int().positive().max(10000),
    price: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })).min(1).max(100),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional().transform((v) => v ? new Date(v) : undefined),
});

export const createRecurringOrderSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  items: z.array(z.object({
    recipeId: z.string().max(100),
    recipeName: z.string().max(200).optional(),
    quantity: z.number().int().positive().max(10000),
    price: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })).min(1).max(100),
  notes: z.string().max(2000).optional(),
  dueDate: dateStringSchema,
  recurrence: z.object({
    frequency: z.literal('weekly'),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    endDate: dateStringSchema,
  }),
}).refine(
  (data) => data.recurrence.endDate > data.dueDate,
  { message: 'END_DATE_MUST_BE_AFTER_DUE_DATE', path: ['recurrence', 'endDate'] }
);

export const updateOrderStatusSchema = z.object({
  status: z.number().int().min(0).max(6),
});

export const updateOrderSchema = z.object({
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional().transform((v) => v ? new Date(v) : undefined),
  items: z.array(z.object({
    recipeId: z.string().max(100),
    recipeName: z.string().max(200).optional(),
    quantity: z.number().int().positive().max(10000),
    price: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })).min(1).max(100).optional(),
});

export const calendarRangeSchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  status: z.coerce.number().int().min(0).max(6).optional(),
});

export const calendarAggregatesSchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
});

export const calendarDaySchema = z.object({
  date: dateStringSchema,
  status: z.coerce.number().int().min(0).max(6).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const approveCancellationSchema = z.object({
  reason: z.string().max(1000).optional(),
});
