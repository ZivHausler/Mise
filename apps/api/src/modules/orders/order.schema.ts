import { z } from 'zod';
import { MAX_RECURRING_OCCURRENCES } from '@mise/shared';

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
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
  customerId: z.string().uuid(),
  items: z.array(z.object({
    recipeId: z.string().max(100),
    recipeName: z.string().max(200).optional(),
    quantity: z.number().int().positive().max(10000),
    price: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })).min(1).max(100),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format'),
  recurrence: z.object({
    frequency: z.literal('weekly'),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format'),
  }),
}).refine(
  (data) => data.recurrence.endDate > data.dueDate,
  { message: 'End date must be after due date', path: ['recurrence', 'endDate'] }
);

export const updateOrderStatusSchema = z.object({
  status: z.number().int().min(0).max(3),
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
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format'),
  status: z.coerce.number().int().min(0).max(3).optional(),
});

export const calendarAggregatesSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format'),
});

export const calendarDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format'),
  status: z.coerce.number().int().min(0).max(3).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
