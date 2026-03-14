import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontService } from '../../../src/modules/storefront/storefront.service.js';
import { createMockEventBus, createCustomer, createOrder, createRecipe, createPayment } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';
import type { PayPalOrdersService } from '../../../src/modules/storefront/paypal-orders.service.js';

// -- Mocks --

vi.mock('../../../src/modules/stores/store.repository.js', () => ({
  PgStoreRepository: {
    findBySlug: vi.fn(),
    updateSlug: vi.fn(),
    isSlugAvailable: vi.fn(),
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
    createWithSource: vi.fn(),
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

vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue({ rows: [] }),
  }),
}));

import { PgStoreRepository } from '../../../src/modules/stores/store.repository.js';
import { MongoRecipeRepository } from '../../../src/modules/recipes/recipe.repository.js';
import { CustomerCrud } from '../../../src/modules/customers/customerCrud.js';
import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { PaymentCrud } from '../../../src/modules/payments/paymentCrud.js';
import { getEventBus } from '../../../src/core/events/event-bus.js';
import { isTierFeatureEnabled } from '../../../src/core/middleware/requireTier.js';

// -- Fixtures --

const MOCK_STORE = {
  id: 1,
  name: 'Test Bakery',
  nameEn: null,
  code: 'TB',
  address: '123 Main St',
  phone: '054-1111111',
  email: 'test@bakery.com',
  taxNumber: null,
  vatRate: 18,
  theme: 'cream' as const,
  slug: 'test-bakery-1',
  storefrontEnabled: true,
  applyThemeToApp: false,
  logoUrl: null,
  bannerUrl: null,
  description: null,
  descriptionEn: null,
  categorySubject: null,
  autoGenerateInvoice: false,
  autoGenerateCreditNote: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const DISABLED_STORE = { ...MOCK_STORE, storefrontEnabled: false };

const PUBLISHED_RECIPE = createRecipe({
  id: 'aabbccddee112233aabbccdd',
  name: 'Chocolate Cake',
  sellingPrice: 60,
  isPublished: true,
  description: 'Rich chocolate cake',
  photos: ['photo1.jpg'],
  tags: ['cakes'],
});

const UNPUBLISHED_RECIPE = createRecipe({
  id: 'ffaabbccddee112233aabbcc',
  name: 'Secret Recipe',
  sellingPrice: 45,
  isPublished: false,
});

function createMockPayPalOrders(): PayPalOrdersService {
  return {
    createOrder: vi.fn().mockResolvedValue({ paypalOrderId: 'PP-123', approvalUrl: 'https://paypal.com/approve' }),
    captureOrder: vi.fn().mockResolvedValue({ status: 'COMPLETED', transactionId: 'TXN-456', amount: { currency: 'ILS', value: '120.00' } }),
  } as unknown as PayPalOrdersService;
}

function setupEnabledStore() {
  (PgStoreRepository.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STORE);
  (isTierFeatureEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
}

// -- Tests --

describe('StorefrontService', () => {
  let service: StorefrontService;
  let eventBus: EventBus;
  let mockPayPalOrders: PayPalOrdersService;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    mockPayPalOrders = createMockPayPalOrders();
    const mockOrderService = {} as any;
    service = new StorefrontService(mockPayPalOrders, mockOrderService);
  });

  // ── getStoreBySlug / requireStorefront ──

  describe('getStoreBySlug', () => {
    it('should return public store info for a valid enabled slug', async () => {
      setupEnabledStore();

      const result = await service.getStoreBySlug('test-bakery-1');

      expect(result).toEqual({
        name: 'Test Bakery',
        slug: 'test-bakery-1',
        theme: 'cream',
        applyThemeToApp: false,
        address: '123 Main St',
        phone: '054-1111111',
        logoUrl: null,
        bannerUrl: null,
        description: null,
        categorySubject: null,
      });
    });

    it('should throw NotFoundError when slug does not exist', async () => {
      (PgStoreRepository.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getStoreBySlug('no-such-store')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when storefront is disabled', async () => {
      (PgStoreRepository.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(DISABLED_STORE);
      (isTierFeatureEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(service.getStoreBySlug('test-bakery-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when store tier is insufficient', async () => {
      (PgStoreRepository.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STORE);
      (isTierFeatureEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(service.getStoreBySlug('test-bakery-1')).rejects.toThrow(NotFoundError);
    });
  });

  // ── getPublishedMenu ──

  describe('getPublishedMenu', () => {
    it('should return published recipes with sellingPrice > 0', async () => {
      setupEnabledStore();
      (MongoRecipeRepository.findPublished as ReturnType<typeof vi.fn>).mockResolvedValue([PUBLISHED_RECIPE]);

      const result = await service.getPublishedMenu('test-bakery-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: PUBLISHED_RECIPE.id,
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake',
        sellingPrice: 60,
        photos: ['photo1.jpg'],
        tags: ['cakes'],
        allergens: [],
      });
    });

    it('should return empty array when no published recipes exist', async () => {
      setupEnabledStore();
      (MongoRecipeRepository.findPublished as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getPublishedMenu('test-bakery-1');

      expect(result).toEqual([]);
    });

    it('should pass tag filter to repository', async () => {
      setupEnabledStore();
      (MongoRecipeRepository.findPublished as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.getPublishedMenu('test-bakery-1', { tag: 'cakes' });

      expect(MongoRecipeRepository.findPublished).toHaveBeenCalledWith(1, { tag: 'cakes' });
    });

    it('should pass search filter to repository', async () => {
      setupEnabledStore();
      (MongoRecipeRepository.findPublished as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.getPublishedMenu('test-bakery-1', { search: 'choco' });

      expect(MongoRecipeRepository.findPublished).toHaveBeenCalledWith(1, { search: 'choco' });
    });

    it('should default missing sellingPrice to 0 in the response', async () => {
      setupEnabledStore();
      const recipeNoPrice = createRecipe({ id: 'aabbccddee112233aabbcc00', sellingPrice: undefined, isPublished: true });
      (MongoRecipeRepository.findPublished as ReturnType<typeof vi.fn>).mockResolvedValue([recipeNoPrice]);

      const result = await service.getPublishedMenu('test-bakery-1');

      expect(result[0]!.sellingPrice).toBe(0);
    });
  });

  // ── getRecipeDetail ──

  describe('getRecipeDetail', () => {
    it('should return recipe detail for a published recipe', async () => {
      setupEnabledStore();
      (MongoRecipeRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(PUBLISHED_RECIPE);

      const result = await service.getRecipeDetail('test-bakery-1', PUBLISHED_RECIPE.id);

      expect(result.id).toBe(PUBLISHED_RECIPE.id);
      expect(result.name).toBe('Chocolate Cake');
      expect(result.ingredients).toEqual([
        { name: 'Flour' },
        { name: 'Sugar' },
      ]);
    });

    it('should throw NotFoundError for an unpublished recipe', async () => {
      setupEnabledStore();
      (MongoRecipeRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(UNPUBLISHED_RECIPE);

      await expect(service.getRecipeDetail('test-bakery-1', UNPUBLISHED_RECIPE.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for a non-existent recipe', async () => {
      setupEnabledStore();
      (MongoRecipeRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getRecipeDetail('test-bakery-1', 'nonexistent000000000000')).rejects.toThrow(NotFoundError);
    });
  });

  // ── createStorefrontOrder ──

  describe('createStorefrontOrder', () => {
    const validOrderData = {
      customer: { name: 'Yael Cohen', phone: '0541234567' },
      items: [{ recipeId: 'aabbccddee112233aabbccdd', quantity: 2 }],
      paymentMethod: 'pay_at_pickup' as const,
    };

    it('should create an order for a new customer (pay at pickup)', async () => {
      setupEnabledStore();
      (CustomerCrud.findByPhone as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (CustomerCrud.create as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer({ id: 10, name: 'Yael Cohen', phone: '0541234567' }));
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([PUBLISHED_RECIPE]);
      (OrderCrud.createWithSource as ReturnType<typeof vi.fn>).mockResolvedValue(createOrder({ id: 5, orderNumber: 100000005, totalAmount: 120 }));

      const result = await service.createStorefrontOrder('test-bakery-1', validOrderData);

      expect(result.orderNumber).toBe(100000005);
      expect(result.totalAmount).toBe(120); // 60 * 2
      expect(result.paymentStatus).toBe('unpaid');
      expect(CustomerCrud.create).toHaveBeenCalledOnce();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'order.created',
          payload: expect.objectContaining({ source: 'storefront', storeId: 1 }),
        }),
      );
    });

    it('should use existing customer when matched by phone', async () => {
      setupEnabledStore();
      const existingCustomer = createCustomer({ id: 7, name: 'Existing', phone: '0541234567' });
      (CustomerCrud.findByPhone as ReturnType<typeof vi.fn>).mockResolvedValue(existingCustomer);
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([PUBLISHED_RECIPE]);
      (OrderCrud.createWithSource as ReturnType<typeof vi.fn>).mockResolvedValue(createOrder({ id: 6, orderNumber: 100000006 }));

      await service.createStorefrontOrder('test-bakery-1', validOrderData);

      expect(CustomerCrud.create).not.toHaveBeenCalled();
      expect(OrderCrud.createWithSource).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ customerId: 7 }),
        'storefront',
        expect.any(Number),
      );
    });

    it('should throw ValidationError when recipe is not published', async () => {
      setupEnabledStore();
      (CustomerCrud.findByPhone as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer());
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([UNPUBLISHED_RECIPE]);

      const data = {
        ...validOrderData,
        items: [{ recipeId: UNPUBLISHED_RECIPE.id, quantity: 1 }],
      };

      await expect(service.createStorefrontOrder('test-bakery-1', data)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when recipe does not exist', async () => {
      setupEnabledStore();
      (CustomerCrud.findByPhone as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer());
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(service.createStorefrontOrder('test-bakery-1', validOrderData)).rejects.toThrow(ValidationError);
    });

    it('should capture PayPal payment and create order when paymentMethod is paypal', async () => {
      setupEnabledStore();
      (CustomerCrud.findByPhone as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer({ id: 1 }));
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([PUBLISHED_RECIPE]);
      (OrderCrud.createWithSource as ReturnType<typeof vi.fn>).mockResolvedValue(createOrder({ id: 8, orderNumber: 100000008 }));

      const data = {
        ...validOrderData,
        paymentMethod: 'paypal' as const,
        paypalOrderId: 'PP-123',
      };

      const result = await service.createStorefrontOrder('test-bakery-1', data);

      expect(result.paymentStatus).toBe('paid');
      expect(mockPayPalOrders.captureOrder).toHaveBeenCalledWith('PP-123');
      expect(PaymentCrud.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          orderId: 8,
          amount: 120,
          method: 'paypal',
        }),
      );
    });

    it('should not create PayPal order for pay_at_pickup', async () => {
      setupEnabledStore();
      (CustomerCrud.findByPhone as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer());
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([PUBLISHED_RECIPE]);
      (OrderCrud.createWithSource as ReturnType<typeof vi.fn>).mockResolvedValue(createOrder());

      const result = await service.createStorefrontOrder('test-bakery-1', validOrderData);

      expect(mockPayPalOrders.captureOrder).not.toHaveBeenCalled();
      expect(result.paymentStatus).toBe('unpaid');
    });

    it('should fire order.created event with correct items', async () => {
      setupEnabledStore();
      (CustomerCrud.findByPhone as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer({ id: 1, name: 'Yael', phone: '0541234567', email: 'yael@test.com' }));
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([PUBLISHED_RECIPE]);
      (OrderCrud.createWithSource as ReturnType<typeof vi.fn>).mockResolvedValue(createOrder({ id: 9, orderNumber: 100000009 }));

      await service.createStorefrontOrder('test-bakery-1', validOrderData);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            items: [{ name: 'Chocolate Cake', quantity: 2, unitPrice: 60 }],
            customerName: 'Yael',
            customerPhone: '0541234567',
          }),
        }),
      );
    });
  });

  // ── getOrderStatus ──

  describe('getOrderStatus', () => {
    it('should return order status when phone matches', async () => {
      setupEnabledStore();
      const order = createOrder({
        id: 1,
        orderNumber: 100000001,
        customer: { id: 1, name: 'Yael' },
        status: 1,
        totalAmount: 120,
        items: [{ recipeId: 'r1', quantity: 2, unitPrice: 60, recipeName: 'Chocolate Cake' }],
        dueDate: new Date('2025-06-01'),
      });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (CustomerCrud.getById as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer({ id: 1, phone: '0541234567' }));
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getOrderStatus('test-bakery-1', 100000001, '0541234567');

      expect(result.orderNumber).toBe(100000001);
      expect(result.status).toBe(1);
      expect(result.totalAmount).toBe(120);
    });

    it('should include recipeId in order status items for reorder support', async () => {
      setupEnabledStore();
      const order = createOrder({
        id: 1,
        orderNumber: 100000001,
        customer: { id: 1, name: 'Yael' },
        status: 3,
        totalAmount: 180,
        items: [
          { recipeId: 'recipe-abc', quantity: 2, unitPrice: 60, recipeName: 'Chocolate Cake' },
          { recipeId: 'recipe-xyz', quantity: 1, unitPrice: 60, recipeName: 'Croissant' },
        ],
        dueDate: new Date('2025-06-01'),
      });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (CustomerCrud.getById as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer({ id: 1, phone: '0541234567' }));
      (MongoRecipeRepository.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getOrderStatus('test-bakery-1', 100000001, '0541234567');

      expect(result.items).toHaveLength(2);
      expect(result.items[0].recipeId).toBe('recipe-abc');
      expect(result.items[1].recipeId).toBe('recipe-xyz');
      expect(result.items[0].name).toBe('Chocolate Cake');
      expect(result.items[1].name).toBe('Croissant');
    });

    it('should throw NotFoundError when phone does not match', async () => {
      setupEnabledStore();
      const order = createOrder({ customer: { id: 1, name: 'Yael' } });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (CustomerCrud.getById as ReturnType<typeof vi.fn>).mockResolvedValue(createCustomer({ id: 1, phone: '0541234567' }));

      await expect(service.getOrderStatus('test-bakery-1', 100000001, '0999999999')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when order does not exist', async () => {
      setupEnabledStore();
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getOrderStatus('test-bakery-1', 999999, '0541234567')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when customer is not found', async () => {
      setupEnabledStore();
      const order = createOrder({ customer: { id: 99, name: null } });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (CustomerCrud.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getOrderStatus('test-bakery-1', 100000001, '0541234567')).rejects.toThrow(NotFoundError);
    });
  });

  // ── capturePayPalOrder ──

  describe('capturePayPalOrder', () => {
    it('should record payment when capture succeeds and amount matches', async () => {
      setupEnabledStore();
      const order = createOrder({ id: 5, orderNumber: 100000005, totalAmount: 120 });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (PaymentCrud.create as ReturnType<typeof vi.fn>).mockResolvedValue(createPayment());

      const result = await service.capturePayPalOrder('test-bakery-1', 'PP123', 100000005);

      expect(result.status).toBe('COMPLETED');
      expect(result.transactionId).toBe('TXN-456');
      expect(PaymentCrud.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          orderId: 5,
          amount: 120,
          method: 'paypal',
          notes: 'PayPal Transaction: TXN-456',
        }),
      );
    });

    it('should throw NotFoundError when order does not exist', async () => {
      setupEnabledStore();
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.capturePayPalOrder('test-bakery-1', 'PP123', 999999)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when captured amount does not match order total', async () => {
      setupEnabledStore();
      const order = createOrder({ id: 5, orderNumber: 100000005, totalAmount: 200 });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);

      // Mock capture returns 100.00 but order total is 200
      await expect(service.capturePayPalOrder('test-bakery-1', 'PP123', 100000005)).rejects.toThrow(ValidationError);
    });

    it('should not record payment when capture status is not COMPLETED', async () => {
      setupEnabledStore();
      const order = createOrder({ id: 5, orderNumber: 100000005, totalAmount: 100 });
      (OrderCrud.findByOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (mockPayPalOrders.captureOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 'PENDING',
        transactionId: '',
        amount: { currency: 'ILS', value: '0' },
      });

      const result = await service.capturePayPalOrder('test-bakery-1', 'PP123', 100000005);

      expect(result.status).toBe('PENDING');
      expect(PaymentCrud.create).not.toHaveBeenCalled();
    });
  });
});
