import { describe, it, expect } from 'vitest';
import {
  slugParamSchema,
  createOrderSchema,
  checkoutQuerySchema,
  menuQuerySchema,
  orderStatusQuerySchema,
  capturePayPalOrderSchema,
  recipeDetailParamSchema,
  orderStatusParamSchema,
} from '../../../src/modules/storefront/storefront.schemas.js';

describe('slugParamSchema', () => {
  it('should accept a valid slug', () => {
    const result = slugParamSchema.parse({ slug: 'my-bakery-1' });
    expect(result.slug).toBe('my-bakery-1');
  });

  it('should accept a slug with only numbers and letters', () => {
    const result = slugParamSchema.parse({ slug: 'bakery123' });
    expect(result.slug).toBe('bakery123');
  });

  it('should accept a two-character slug', () => {
    const result = slugParamSchema.parse({ slug: 'ab' });
    expect(result.slug).toBe('ab');
  });

  it('should reject a single character slug (regex requires start + end char)', () => {
    expect(() => slugParamSchema.parse({ slug: 'a' })).toThrow();
  });

  it('should reject slug with special characters', () => {
    expect(() => slugParamSchema.parse({ slug: 'my_bakery!' })).toThrow();
    expect(() => slugParamSchema.parse({ slug: 'my bakery' })).toThrow();
  });

  it('should reject slug starting with a hyphen', () => {
    expect(() => slugParamSchema.parse({ slug: '-my-bakery' })).toThrow();
  });

  it('should reject slug ending with a hyphen', () => {
    expect(() => slugParamSchema.parse({ slug: 'my-bakery-' })).toThrow();
  });

  it('should reject uppercase slug', () => {
    expect(() => slugParamSchema.parse({ slug: 'My-Bakery' })).toThrow();
  });

  it('should reject empty slug', () => {
    expect(() => slugParamSchema.parse({ slug: '' })).toThrow();
  });

  it('should reject slug longer than 100 characters', () => {
    expect(() => slugParamSchema.parse({ slug: 'a'.repeat(101) })).toThrow();
  });
});

describe('createOrderSchema', () => {
  const validOrder = {
    customer: { name: 'Yael Cohen', phone: '0541234567' },
    items: [{ recipeId: 'abc123', quantity: 2 }],
    paymentMethod: 'pay_at_pickup',
  };

  it('should accept a valid order', () => {
    const result = createOrderSchema.parse(validOrder);
    expect(result.customer.name).toBe('Yael Cohen');
    expect(result.items).toHaveLength(1);
    expect(result.paymentMethod).toBe('pay_at_pickup');
  });

  it('should accept paypal payment method', () => {
    const result = createOrderSchema.parse({
      ...validOrder,
      paymentMethod: 'paypal',
    });
    expect(result.paymentMethod).toBe('paypal');
  });

  it('should accept optional notes and dueDate', () => {
    const result = createOrderSchema.parse({
      ...validOrder,
      notes: 'Please add extra frosting',
      dueDate: '2025-06-01T10:00:00.000Z',
    });
    expect(result.notes).toBe('Please add extra frosting');
    expect(result.dueDate).toBe('2025-06-01T10:00:00.000Z');
  });

  it('should accept international phone with + prefix', () => {
    const result = createOrderSchema.parse({
      ...validOrder,
      customer: { name: 'Test', phone: '+972541234567' },
    });
    expect(result.customer.phone).toBe('+972541234567');
  });

  it('should reject missing customer name', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        customer: { phone: '0541234567' },
      }),
    ).toThrow();
  });

  it('should reject missing phone', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        customer: { name: 'Yael' },
      }),
    ).toThrow();
  });

  it('should reject invalid phone format', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        customer: { name: 'Yael', phone: 'not-a-phone' },
      }),
    ).toThrow();
  });

  it('should reject phone shorter than 9 digits', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        customer: { name: 'Yael', phone: '12345678' },
      }),
    ).toThrow();
  });

  it('should reject empty items array', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        items: [],
      }),
    ).toThrow();
  });

  it('should reject more than 50 items', () => {
    const tooManyItems = Array.from({ length: 51 }, (_, i) => ({
      recipeId: `recipe-${i}`,
      quantity: 1,
    }));
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        items: tooManyItems,
      }),
    ).toThrow();
  });

  it('should reject quantity of 0', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        items: [{ recipeId: 'abc', quantity: 0 }],
      }),
    ).toThrow();
  });

  it('should reject quantity over 100', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        items: [{ recipeId: 'abc', quantity: 101 }],
      }),
    ).toThrow();
  });

  it('should reject invalid payment method', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        paymentMethod: 'bitcoin',
      }),
    ).toThrow();
  });

  it('should trim customer name', () => {
    const result = createOrderSchema.parse({
      ...validOrder,
      customer: { name: '  Yael  ', phone: '0541234567' },
    });
    expect(result.customer.name).toBe('Yael');
  });

  it('should accept empty string email', () => {
    const result = createOrderSchema.parse({
      ...validOrder,
      customer: { name: 'Yael', phone: '0541234567', email: '' },
    });
    expect(result.customer.email).toBe('');
  });

  it('should reject invalid email format', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        customer: { name: 'Yael', phone: '0541234567', email: 'not-email' },
      }),
    ).toThrow();
  });

  it('should reject notes longer than 1000 characters', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        notes: 'x'.repeat(1001),
      }),
    ).toThrow();
  });
});

describe('checkoutQuerySchema', () => {
  it('should accept valid orderId and amount', () => {
    const result = checkoutQuerySchema.parse({ orderId: 'PP123ABC', amount: '120.50' });
    expect(result.orderId).toBe('PP123ABC');
    expect(result.amount).toBe('120.50');
  });

  it('should accept integer amount', () => {
    const result = checkoutQuerySchema.parse({ orderId: 'ORDER1', amount: '100' });
    expect(result.amount).toBe('100');
  });

  it('should reject XSS attempt in orderId', () => {
    expect(() =>
      checkoutQuerySchema.parse({ orderId: '<script>alert(1)</script>', amount: '100' }),
    ).toThrow();
  });

  it('should reject orderId with special characters', () => {
    expect(() =>
      checkoutQuerySchema.parse({ orderId: 'order-with-dashes', amount: '100' }),
    ).toThrow();
  });

  it('should reject non-numeric amount', () => {
    expect(() =>
      checkoutQuerySchema.parse({ orderId: 'ORDER1', amount: 'abc' }),
    ).toThrow();
  });

  it('should reject amount with more than 2 decimal places', () => {
    expect(() =>
      checkoutQuerySchema.parse({ orderId: 'ORDER1', amount: '10.999' }),
    ).toThrow();
  });

  it('should reject missing orderId', () => {
    expect(() => checkoutQuerySchema.parse({ amount: '100' })).toThrow();
  });

  it('should reject empty orderId', () => {
    expect(() => checkoutQuerySchema.parse({ orderId: '', amount: '100' })).toThrow();
  });
});

describe('menuQuerySchema', () => {
  it('should accept empty object (all optional)', () => {
    const result = menuQuerySchema.parse({});
    expect(result).toEqual({ lang: 'he' });
  });

  it('should accept tag filter', () => {
    const result = menuQuerySchema.parse({ tag: 'cakes' });
    expect(result.tag).toBe('cakes');
  });

  it('should accept search filter', () => {
    const result = menuQuerySchema.parse({ search: 'chocolate' });
    expect(result.search).toBe('chocolate');
  });

  it('should reject search longer than 100 chars', () => {
    expect(() => menuQuerySchema.parse({ search: 'x'.repeat(101) })).toThrow();
  });
});

describe('orderStatusQuerySchema', () => {
  it('should accept a valid phone', () => {
    const result = orderStatusQuerySchema.parse({ phone: '0541234567' });
    expect(result.phone).toBe('0541234567');
  });

  it('should accept international phone', () => {
    const result = orderStatusQuerySchema.parse({ phone: '+972541234567' });
    expect(result.phone).toBe('+972541234567');
  });

  it('should reject invalid phone', () => {
    expect(() => orderStatusQuerySchema.parse({ phone: 'abc' })).toThrow();
  });
});

describe('capturePayPalOrderSchema', () => {
  it('should accept valid capture request', () => {
    const result = capturePayPalOrderSchema.parse({ paypalOrderId: 'PP123', orderNumber: 100000001 });
    expect(result.paypalOrderId).toBe('PP123');
    expect(result.orderNumber).toBe(100000001);
  });

  it('should reject non-positive orderNumber', () => {
    expect(() => capturePayPalOrderSchema.parse({ paypalOrderId: 'PP123', orderNumber: 0 })).toThrow();
    expect(() => capturePayPalOrderSchema.parse({ paypalOrderId: 'PP123', orderNumber: -1 })).toThrow();
  });

  it('should reject empty paypalOrderId', () => {
    expect(() => capturePayPalOrderSchema.parse({ paypalOrderId: '', orderNumber: 1 })).toThrow();
  });
});

describe('recipeDetailParamSchema', () => {
  it('should accept valid slug + 24-char hex recipeId', () => {
    const result = recipeDetailParamSchema.parse({ slug: 'my-bakery-1', recipeId: 'aabbccddee112233aabbccdd' });
    expect(result.recipeId).toBe('aabbccddee112233aabbccdd');
  });

  it('should reject recipeId that is not 24 hex chars', () => {
    expect(() => recipeDetailParamSchema.parse({ slug: 'my-bakery-1', recipeId: 'too-short' })).toThrow();
    expect(() => recipeDetailParamSchema.parse({ slug: 'my-bakery-1', recipeId: 'ZZZZZZZZZZZZZZZZZZZZZZZZ' })).toThrow();
  });
});

describe('orderStatusParamSchema', () => {
  it('should coerce string orderNumber to number', () => {
    const result = orderStatusParamSchema.parse({ slug: 'my-bakery-1', orderNumber: '100000001' });
    expect(result.orderNumber).toBe(100000001);
  });

  it('should reject non-positive orderNumber', () => {
    expect(() => orderStatusParamSchema.parse({ slug: 'my-bakery-1', orderNumber: '0' })).toThrow();
    expect(() => orderStatusParamSchema.parse({ slug: 'my-bakery-1', orderNumber: '-1' })).toThrow();
  });
});
