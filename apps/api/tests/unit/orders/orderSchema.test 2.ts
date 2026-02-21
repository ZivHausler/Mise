import { describe, it, expect } from 'vitest';
import { createRecurringOrderSchema, updateOrderSchema } from '../../../src/modules/orders/order.schema.js';

describe('createRecurringOrderSchema', () => {
  const validInput = {
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    items: [{ recipeId: 'r1', quantity: 2 }],
    dueDate: '2025-03-01',
    recurrence: {
      frequency: 'weekly' as const,
      daysOfWeek: [1, 3],
      endDate: '2025-04-01',
    },
  };

  it('should parse valid recurring order input', () => {
    const result = createRecurringOrderSchema.parse(validInput);
    expect(result.recurrence.frequency).toBe('weekly');
    expect(result.recurrence.daysOfWeek).toEqual([1, 3]);
  });

  it('should reject endDate before dueDate', () => {
    expect(() =>
      createRecurringOrderSchema.parse({
        ...validInput,
        recurrence: { ...validInput.recurrence, endDate: '2025-02-01' },
      }),
    ).toThrow();
  });

  it('should reject endDate equal to dueDate', () => {
    expect(() =>
      createRecurringOrderSchema.parse({
        ...validInput,
        recurrence: { ...validInput.recurrence, endDate: '2025-03-01' },
      }),
    ).toThrow();
  });

  it('should reject invalid daysOfWeek values', () => {
    expect(() =>
      createRecurringOrderSchema.parse({
        ...validInput,
        recurrence: { ...validInput.recurrence, daysOfWeek: [7] },
      }),
    ).toThrow();
  });

  it('should reject empty daysOfWeek', () => {
    expect(() =>
      createRecurringOrderSchema.parse({
        ...validInput,
        recurrence: { ...validInput.recurrence, daysOfWeek: [] },
      }),
    ).toThrow();
  });

  it('should reject non-weekly frequency', () => {
    expect(() =>
      createRecurringOrderSchema.parse({
        ...validInput,
        recurrence: { ...validInput.recurrence, frequency: 'daily' },
      }),
    ).toThrow();
  });

  it('should reject invalid dueDate format', () => {
    expect(() =>
      createRecurringOrderSchema.parse({
        ...validInput,
        dueDate: '03/01/2025',
      }),
    ).toThrow();
  });
});

describe('updateOrderSchema', () => {
  it('should parse notes-only update', () => {
    const result = updateOrderSchema.parse({ notes: 'rush' });
    expect(result.notes).toBe('rush');
    expect(result.items).toBeUndefined();
  });

  it('should parse items update', () => {
    const result = updateOrderSchema.parse({
      items: [{ recipeId: 'r1', quantity: 5, price: 10 }],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items![0].quantity).toBe(5);
  });

  it('should transform dueDate string to Date', () => {
    const result = updateOrderSchema.parse({ dueDate: '2025-06-01' });
    expect(result.dueDate).toBeInstanceOf(Date);
  });

  it('should reject empty items array', () => {
    expect(() => updateOrderSchema.parse({ items: [] })).toThrow();
  });

  it('should reject item with zero quantity', () => {
    expect(() =>
      updateOrderSchema.parse({ items: [{ recipeId: 'r1', quantity: 0 }] }),
    ).toThrow();
  });
});
