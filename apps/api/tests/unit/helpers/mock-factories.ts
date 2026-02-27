import { vi } from 'vitest';
import type { EventBus } from '../../../src/core/events/event-bus.js';
import type { User } from '../../../src/modules/auth/auth.types.js';
import type { Ingredient } from '../../../src/modules/inventory/inventory.types.js';
import type { Customer } from '../../../src/modules/customers/customer.types.js';
import type { Recipe } from '../../../src/modules/recipes/recipe.types.js';
import type { Order } from '../../../src/modules/orders/order.types.js';
import type { Payment } from '../../../src/modules/payments/payment.types.js';

// ─── Event Bus Mock ─────────────────────────────────────────────

export function createMockEventBus(): EventBus {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };
}

// ─── Fixture Factories ──────────────────────────────────────────

export function createUser(overrides?: Partial<User>): User {
  return {
    id: 1,
    email: 'baker@mise.com',
    passwordHash: 'MOCK_BCRYPT_HASH_NOT_REAL',
    name: 'Test Baker',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createIngredient(overrides?: Partial<Ingredient>): Ingredient {
  return {
    id: 1,
    name: 'Flour',
    unit: 'kg',
    quantity: 50,
    costPerUnit: 3.5,
    lowStockThreshold: 10,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createCustomer(overrides?: Partial<Customer>): Customer {
  return {
    id: 1,
    name: 'Jane Doe',
    phone: '054-1234567',
    email: 'jane@example.com',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createRecipe(overrides?: Partial<Recipe>): Recipe {
  return {
    id: 'recipe-1',
    name: 'Chocolate Cake',
    ingredients: [
      { ingredientId: 'ing-1', name: 'Flour', quantity: 2, unit: 'kg', costPerUnit: 3.5 },
      { ingredientId: 'ing-2', name: 'Sugar', quantity: 1, unit: 'kg', costPerUnit: 5 },
    ],
    steps: [
      { order: 1, type: 'step', instruction: 'Mix dry ingredients' },
      { order: 2, type: 'step', instruction: 'Bake at 180C for 30 minutes' },
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createOrder(overrides?: Partial<Order>): Order {
  return {
    id: 1,
    orderNumber: 100000001,
    customer: { id: 1, name: null },
    items: [{ recipeId: 'recipe-1', quantity: 2, unitPrice: 50 }],
    status: 0, // ORDER_STATUS.RECEIVED
    totalAmount: 100,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createPayment(overrides?: Partial<Payment>): Payment {
  return {
    id: 1,
    order: { id: 1, number: null },
    customer: { id: null, name: null },
    amount: 50,
    method: 'cash',
    status: 'completed',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}
