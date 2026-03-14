import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontService } from '../../../src/modules/storefront/storefront.service.js';
import { createMockEventBus, createCustomer, createOrder } from '../helpers/mock-factories.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';
import type { PayPalOrdersService } from '../../../src/modules/storefront/paypal-orders.service.js';

// -- Mocks --

vi.mock('../../../src/modules/stores/store.repository.js', () => ({
  PgStoreRepository: {
    findBySlug: vi.fn(),
  },
}));

vi.mock('../../../src/modules/recipes/recipe.repository.js', () => ({
  MongoRecipeRepository: {
    findPublished: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: {
    findByPhone: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: {
    create: vi.fn(),
    findByOrderNumber: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/order-notification.repository.js', () => ({
  PgOrderNotificationRepository: {
    countUnreadByOrderId: vi.fn().mockResolvedValue(0),
    findByOrderId: vi.fn().mockResolvedValue([]),
    markAllReadByOrderId: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/modules/payments/paymentCrud.js', () => ({
  PaymentCrud: {
    create: vi.fn(),
  },
}));

vi.mock('../../../src/core/events/event-bus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/core/events/event-bus.js')>();
  return { ...original, getEventBus: vi.fn() };
});

vi.mock('../../../src/core/middleware/requireTier.js', () => ({
  isTierFeatureEnabled: vi.fn(),
}));

vi.mock('../../../src/config/env.js', () => ({
  env: {
    PAYPAL_CLIENT_ID: 'test-client-id',
    PAYPAL_CLIENT_SECRET: 'test-secret',
    PAYPAL_API_URL: 'https://api-m.sandbox.paypal.com',
  },
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/core/events/event-names.js', () => ({
  EventNames: { ORDER_CREATED: 'order.created' },
}));

import { PgStoreRepository } from '../../../src/modules/stores/store.repository.js';
import { MongoRecipeRepository } from '../../../src/modules/recipes/recipe.repository.js';
import { CustomerCrud } from '../../../src/modules/customers/customerCrud.js';
import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { getEventBus } from '../../../src/core/events/event-bus.js';
import { isTierFeatureEnabled } from '../../../src/core/middleware/requireTier.js';

// -- Fixtures --

const MOCK_STORE = {
  id: 1,
  name: 'Test Bakery',
  code: 'TB',
  address: '123 Main St',
  phone: '054-1111111',
  email: 'test@bakery.com',
  taxNumber: null,
  vatRate: 18,
  theme: 'cream' as const,
  slug: 'test-bakery-1',
  storefrontEnabled: true,
  autoGenerateInvoice: false,
  autoGenerateCreditNote: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

function setupEnabledStore() {
  (PgStoreRepository.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STORE);
  (isTierFeatureEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
}

function createMockPayPalOrders(): PayPalOrdersService {
  return {
    createOrder: vi.fn().mockResolvedValue({ paypalOrderId: 'PP-123', approvalUrl: 'https://paypal.com/approve' }),
    captureOrder: vi.fn().mockResolvedValue({ status: 'COMPLETED', transactionId: 'TXN-456', amount: { currency: 'ILS', value: '100.00' } }),
  } as unknown as PayPalOrdersService;
}

function setupOrderStatusMocks(order: ReturnType<typeof createOrder>, customerPhone: string) {
  (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
  (CustomerCrud.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
    createCustomer({ id: order.customer.id, phone: customerPhone }),
  );
  (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

// -- Tests --

describe('StorefrontService — reorder (recipeId in getOrderStatus)', () => {
  let service: StorefrontService;
  let eventBus: EventBus;

  const PHONE = '0541234567';

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    const mockPayPalOrders = createMockPayPalOrders();
    const mockOrderService = {} as any;
    service = new StorefrontService(mockPayPalOrders, mockOrderService);
  });

  // ── recipeId presence ──

  describe('recipeId field in order status items', () => {
    it('should return recipeId for a single-item order', async () => {
      setupEnabledStore();
      const order = createOrder({
        id: 1,
        orderNumber: 100000001,
        customer: { id: 1, name: 'Yael' },
        status: 3, // delivered
        totalAmount: 60,
        items: [{ recipeId: 'recipe-chocolate', quantity: 1, unitPrice: 60, recipeName: 'Chocolate Cake' }],
        dueDate: new Date('2025-06-01'),
      });
      setupOrderStatusMocks(order, PHONE);

      const result = await service.getOrderStatus('test-bakery-1', 100000001, PHONE);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].recipeId).toBe('recipe-chocolate');
      expect(result.items[0].name).toBe('Chocolate Cake');
      expect(result.items[0].quantity).toBe(1);
      expect(result.items[0].unitPrice).toBe(60);
    });

    it('should return correct recipeId for every item in a multi-item order', async () => {
      setupEnabledStore();
      const items = [
        { recipeId: 'recipe-abc', quantity: 2, unitPrice: 60, recipeName: 'Chocolate Cake' },
        { recipeId: 'recipe-def', quantity: 3, unitPrice: 25, recipeName: 'Croissant' },
        { recipeId: 'recipe-ghi', quantity: 1, unitPrice: 45, recipeName: 'Sourdough Bread' },
      ];
      const order = createOrder({
        id: 2,
        orderNumber: 100000002,
        customer: { id: 1, name: 'Dan' },
        status: 3,
        totalAmount: 240,
        items,
        dueDate: new Date('2025-07-01'),
      });
      setupOrderStatusMocks(order, PHONE);

      const result = await service.getOrderStatus('test-bakery-1', 100000002, PHONE);

      expect(result.items).toHaveLength(3);
      result.items.forEach((item, idx) => {
        expect(item.recipeId).toBe(items[idx].recipeId);
        expect(item.name).toBe(items[idx].recipeName);
        expect(item.quantity).toBe(items[idx].quantity);
        expect(item.unitPrice).toBe(items[idx].unitPrice);
      });
    });

    it('should preserve recipeId that matches the stored value from order creation', async () => {
      setupEnabledStore();
      const storedRecipeId = 'aabbccddee112233aabbccdd'; // realistic MongoDB ObjectId
      const order = createOrder({
        id: 3,
        orderNumber: 100000003,
        customer: { id: 1, name: 'Yael' },
        status: 3,
        totalAmount: 120,
        items: [{ recipeId: storedRecipeId, quantity: 2, unitPrice: 60, recipeName: 'Challah' }],
        dueDate: new Date('2025-06-15'),
      });
      setupOrderStatusMocks(order, PHONE);

      const result = await service.getOrderStatus('test-bakery-1', 100000003, PHONE);

      // The recipeId returned must exactly match what was stored
      expect(result.items[0].recipeId).toBe(storedRecipeId);
    });
  });

  // ── Edge cases ──

  describe('edge cases for reorder data', () => {
    it('should handle an order with zero items (empty array)', async () => {
      setupEnabledStore();
      const order = createOrder({
        id: 4,
        orderNumber: 100000004,
        customer: { id: 1, name: 'Noa' },
        status: 3,
        totalAmount: 0,
        items: [],
        dueDate: new Date('2025-08-01'),
      });
      setupOrderStatusMocks(order, PHONE);

      const result = await service.getOrderStatus('test-bakery-1', 100000004, PHONE);

      expect(result.items).toEqual([]);
    });

    it('should return recipeId even when the recipe has been deleted from MongoDB', async () => {
      setupEnabledStore();
      const deletedRecipeId = 'deleted-recipe-999';
      const order = createOrder({
        id: 5,
        orderNumber: 100000005,
        customer: { id: 1, name: 'Avi' },
        status: 3,
        totalAmount: 50,
        items: [{ recipeId: deletedRecipeId, quantity: 1, unitPrice: 50, recipeName: 'Old Pastry' }],
        dueDate: new Date('2025-06-20'),
      });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (CustomerCrud.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        createCustomer({ id: 1, phone: PHONE }),
      );
      // findByIds returns empty — recipe was deleted from MongoDB
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getOrderStatus('test-bakery-1', 100000005, PHONE);

      // recipeId should still be present (comes from order JSONB, not MongoDB)
      expect(result.items[0].recipeId).toBe(deletedRecipeId);
      // photo should be null since recipe is gone
      expect(result.items[0].photo).toBeNull();
      // name falls back to recipeName stored in the order
      expect(result.items[0].name).toBe('Old Pastry');
    });

    it('should use recipeId as name fallback when recipeName is missing', async () => {
      setupEnabledStore();
      const recipeId = 'recipe-no-name';
      const order = createOrder({
        id: 6,
        orderNumber: 100000006,
        customer: { id: 1, name: 'Lior' },
        status: 3,
        totalAmount: 30,
        items: [{ recipeId, quantity: 1, unitPrice: 30 }], // no recipeName
        dueDate: new Date('2025-06-25'),
      });
      setupOrderStatusMocks(order, PHONE);

      const result = await service.getOrderStatus('test-bakery-1', 100000006, PHONE);

      // Service code: name: i.recipeName || i.recipeId — falls back to recipeId
      expect(result.items[0].recipeId).toBe(recipeId);
      expect(result.items[0].name).toBe(recipeId);
    });

    it('should handle a large order with many items, each having recipeId', async () => {
      setupEnabledStore();
      const itemCount = 50;
      const items = Array.from({ length: itemCount }, (_, i) => ({
        recipeId: `recipe-${i}`,
        quantity: i + 1,
        unitPrice: 10,
        recipeName: `Item ${i}`,
      }));
      const order = createOrder({
        id: 7,
        orderNumber: 100000007,
        customer: { id: 1, name: 'Bulk Buyer' },
        status: 3,
        totalAmount: items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
        items,
        dueDate: new Date('2025-09-01'),
      });
      setupOrderStatusMocks(order, PHONE);

      const result = await service.getOrderStatus('test-bakery-1', 100000007, PHONE);

      expect(result.items).toHaveLength(itemCount);
      for (let i = 0; i < itemCount; i++) {
        expect(result.items[i].recipeId).toBe(`recipe-${i}`);
        expect(result.items[i].name).toBe(`Item ${i}`);
      }
    });

    it('should return photo from MongoDB when recipe still exists', async () => {
      setupEnabledStore();
      const recipeId = 'recipe-with-photo';
      const order = createOrder({
        id: 8,
        orderNumber: 100000008,
        customer: { id: 1, name: 'Sara' },
        status: 3,
        totalAmount: 80,
        items: [{ recipeId, quantity: 2, unitPrice: 40, recipeName: 'Focaccia' }],
        dueDate: new Date('2025-07-10'),
      });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (CustomerCrud.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        createCustomer({ id: 1, phone: PHONE }),
      );
      // Recipe still exists in MongoDB with a photo
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: recipeId, photos: ['https://storage.example.com/focaccia.jpg'] },
      ]);

      const result = await service.getOrderStatus('test-bakery-1', 100000008, PHONE);

      expect(result.items[0].recipeId).toBe(recipeId);
      expect(result.items[0].photo).toBe('https://storage.example.com/focaccia.jpg');
    });

    it('should handle mixed items — some with deleted recipes, some still existing', async () => {
      setupEnabledStore();
      const order = createOrder({
        id: 9,
        orderNumber: 100000009,
        customer: { id: 1, name: 'Michal' },
        status: 3,
        totalAmount: 110,
        items: [
          { recipeId: 'still-exists', quantity: 1, unitPrice: 60, recipeName: 'Babka' },
          { recipeId: 'deleted-recipe', quantity: 1, unitPrice: 50, recipeName: 'Old Cake' },
        ],
        dueDate: new Date('2025-08-15'),
      });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (CustomerCrud.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        createCustomer({ id: 1, phone: PHONE }),
      );
      // Only one recipe still exists
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'still-exists', photos: ['babka.jpg'] },
      ]);

      const result = await service.getOrderStatus('test-bakery-1', 100000009, PHONE);

      // Both items have recipeId
      expect(result.items[0].recipeId).toBe('still-exists');
      expect(result.items[1].recipeId).toBe('deleted-recipe');
      // Only existing recipe has a photo
      expect(result.items[0].photo).toBe('babka.jpg');
      expect(result.items[1].photo).toBeNull();
    });
  });
});
