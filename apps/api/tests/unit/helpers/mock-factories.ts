import { vi } from 'vitest';
import type { IAuthRepository } from '../../../src/modules/auth/auth.repository.js';
import type { IInventoryRepository } from '../../../src/modules/inventory/inventory.repository.js';
import type { ICustomerRepository } from '../../../src/modules/customers/customer.repository.js';
import type { IRecipeRepository } from '../../../src/modules/recipes/recipe.repository.js';
import type { IOrderRepository } from '../../../src/modules/orders/order.repository.js';
import type { IPaymentRepository } from '../../../src/modules/payments/payment.repository.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';
import type { User } from '../../../src/modules/auth/auth.types.js';
import type { Ingredient, InventoryLog } from '../../../src/modules/inventory/inventory.types.js';
import type { Customer } from '../../../src/modules/customers/customer.types.js';
import type { Recipe } from '../../../src/modules/recipes/recipe.types.js';
import type { Order } from '../../../src/modules/orders/order.types.js';
import type { Payment } from '../../../src/modules/payments/payment.types.js';

// ─── Auth Repository Mock ───────────────────────────────────────

export function createMockAuthRepository(): IAuthRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  };
}

// ─── Inventory Repository Mock ──────────────────────────────────

export function createMockInventoryRepository(): IInventoryRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    findLowStock: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    adjustStock: vi.fn(),
    getLog: vi.fn(),
    delete: vi.fn(),
  };
}

// ─── Customer Repository Mock ───────────────────────────────────

export function createMockCustomerRepository(): ICustomerRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

// ─── Recipe Repository Mock ─────────────────────────────────────

export function createMockRecipeRepository(): IRecipeRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

// ─── Order Repository Mock ──────────────────────────────────────

export function createMockOrderRepository(): IOrderRepository {
  return {
    findById: vi.fn(),
    findByCustomerId: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  };
}

// ─── Payment Repository Mock ────────────────────────────────────

export function createMockPaymentRepository(): IPaymentRepository {
  return {
    findById: vi.fn(),
    findByOrderId: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };
}

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
    id: 'user-1',
    email: 'baker@mise.com',
    passwordHash: 'MOCK_BCRYPT_HASH_NOT_REAL',
    name: 'Test Baker',
    role: 'admin',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createIngredient(overrides?: Partial<Ingredient>): Ingredient {
  return {
    id: 'ing-1',
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
    id: 'cust-1',
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
      { order: 1, instruction: 'Mix dry ingredients' },
      { order: 2, instruction: 'Bake at 180C for 30 minutes' },
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createOrder(overrides?: Partial<Order>): Order {
  return {
    id: 'order-1',
    customerId: 'cust-1',
    items: [{ recipeId: 'recipe-1', quantity: 2, unitPrice: 50 }],
    status: 'received',
    totalAmount: 100,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createPayment(overrides?: Partial<Payment>): Payment {
  return {
    id: 'pay-1',
    orderId: 'order-1',
    amount: 50,
    method: 'cash',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}
