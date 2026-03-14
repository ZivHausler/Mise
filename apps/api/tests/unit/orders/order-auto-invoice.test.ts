import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createMockEventBus, createOrder } from '../helpers/mock-factories.js';
import { ORDER_STATUS } from '../../../src/modules/orders/order.types.js';
import { ErrorCode } from '@mise/shared';
import type { EventBus } from '../../../src/core/events/event-bus.js';

// ─── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../src/core/events/event-bus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/core/events/event-bus.js')>();
  return { ...original, getEventBus: vi.fn() };
});

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: {
    getById: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/use-cases/updateOrderStatus.js', () => ({
  UpdateOrderStatusUseCase: vi.fn().mockImplementation(() => ({ execute: vi.fn() })),
}));

vi.mock('../../../src/modules/orders/order-notification.repository.js', () => ({
  PgOrderNotificationRepository: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/modules/orders/order-notification.messages.js', () => ({
  getNotificationMessage: vi.fn().mockReturnValue('Status changed'),
}));

vi.mock('../../../src/modules/stores/store.repository.js', () => ({
  PgStoreRepository: {
    findStoreById: vi.fn(),
    getOwnerUserId: vi.fn(),
  },
}));

vi.mock('../../../src/modules/payments/paymentCrud.js', () => ({
  PaymentCrud: {
    getByOrderId: vi.fn().mockResolvedValue([]),
    refund: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: { getById: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../../src/modules/shared/unitConversion.js', () => ({
  unitConversionFactor: vi.fn().mockReturnValue(1),
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getEventBus } from '../../../src/core/events/event-bus.js';
import { UpdateOrderStatusUseCase } from '../../../src/modules/orders/use-cases/updateOrderStatus.js';
import { PgStoreRepository } from '../../../src/modules/stores/store.repository.js';

// ─── Constants ──────────────────────────────────────────────────

const STORE_ID = 1;
const ORDER_ID = 42;
const OWNER_USER_ID = 10;

// ─── Helpers ────────────────────────────────────────────────────

function createMockInvoiceService() {
  return { create: vi.fn().mockResolvedValue({ id: 1 }) } as any;
}

function mockUseCaseExecute(status: number, previousStatus: number = ORDER_STATUS.READY) {
  const order = createOrder({ id: ORDER_ID, status: status as any });
  const executeMock = vi.fn().mockResolvedValue({ order, previousStatus });
  vi.mocked(UpdateOrderStatusUseCase).mockImplementation(() => ({ execute: executeMock }) as any);
  return { order, executeMock };
}

function mockStoreWithAutoInvoice(enabled: boolean) {
  vi.mocked(PgStoreRepository.findStoreById).mockResolvedValue({
    id: STORE_ID,
    name: 'Test Bakery',
    autoGenerateInvoice: enabled,
  } as any);
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Auto Invoice on Order Delivery', () => {
  let eventBus: EventBus;
  let invoiceService: ReturnType<typeof createMockInvoiceService>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    invoiceService = createMockInvoiceService();
  });

  it('should create invoice when order is delivered and autoGenerateInvoice is enabled', async () => {
    mockUseCaseExecute(ORDER_STATUS.DELIVERED);
    mockStoreWithAutoInvoice(true);
    vi.mocked(PgStoreRepository.getOwnerUserId).mockResolvedValue(OWNER_USER_ID);

    const service = new OrderService(undefined, undefined, undefined, invoiceService);
    const result = await service.updateStatus(STORE_ID, ORDER_ID, ORDER_STATUS.DELIVERED);

    expect(result.status).toBe(ORDER_STATUS.DELIVERED);
    expect(invoiceService.create).toHaveBeenCalledWith(STORE_ID, OWNER_USER_ID, { orderId: ORDER_ID });
  });

  it('should skip invoice when autoGenerateInvoice is disabled', async () => {
    mockUseCaseExecute(ORDER_STATUS.DELIVERED);
    mockStoreWithAutoInvoice(false);

    const service = new OrderService(undefined, undefined, undefined, invoiceService);
    const result = await service.updateStatus(STORE_ID, ORDER_ID, ORDER_STATUS.DELIVERED);

    expect(result.status).toBe(ORDER_STATUS.DELIVERED);
    expect(invoiceService.create).not.toHaveBeenCalled();
  });

  it('should succeed when store has no tax_number (INVOICE_STORE_MISSING_TAX)', async () => {
    mockUseCaseExecute(ORDER_STATUS.DELIVERED);
    mockStoreWithAutoInvoice(true);
    vi.mocked(PgStoreRepository.getOwnerUserId).mockResolvedValue(OWNER_USER_ID);
    invoiceService.create.mockRejectedValue(
      Object.assign(new Error('Missing tax number'), { errorCode: ErrorCode.INVOICE_STORE_MISSING_TAX }),
    );

    const service = new OrderService(undefined, undefined, undefined, invoiceService);
    const result = await service.updateStatus(STORE_ID, ORDER_ID, ORDER_STATUS.DELIVERED);

    expect(result.status).toBe(ORDER_STATUS.DELIVERED);
  });

  it('should succeed when invoice already exists (INVOICE_ALREADY_EXISTS)', async () => {
    mockUseCaseExecute(ORDER_STATUS.DELIVERED);
    mockStoreWithAutoInvoice(true);
    vi.mocked(PgStoreRepository.getOwnerUserId).mockResolvedValue(OWNER_USER_ID);
    invoiceService.create.mockRejectedValue(
      Object.assign(new Error('Invoice exists'), { errorCode: ErrorCode.INVOICE_ALREADY_EXISTS }),
    );

    const service = new OrderService(undefined, undefined, undefined, invoiceService);
    const result = await service.updateStatus(STORE_ID, ORDER_ID, ORDER_STATUS.DELIVERED);

    expect(result.status).toBe(ORDER_STATUS.DELIVERED);
  });

  it('should succeed when store has no owner (getOwnerUserId returns null)', async () => {
    mockUseCaseExecute(ORDER_STATUS.DELIVERED);
    mockStoreWithAutoInvoice(true);
    vi.mocked(PgStoreRepository.getOwnerUserId).mockResolvedValue(null);

    const service = new OrderService(undefined, undefined, undefined, invoiceService);
    const result = await service.updateStatus(STORE_ID, ORDER_ID, ORDER_STATUS.DELIVERED);

    expect(result.status).toBe(ORDER_STATUS.DELIVERED);
    expect(invoiceService.create).not.toHaveBeenCalled();
  });

  it('should succeed when InvoiceService is not injected', async () => {
    mockUseCaseExecute(ORDER_STATUS.DELIVERED);

    const service = new OrderService(undefined, undefined, undefined); // no invoiceService
    const result = await service.updateStatus(STORE_ID, ORDER_ID, ORDER_STATUS.DELIVERED);

    expect(result.status).toBe(ORDER_STATUS.DELIVERED);
    // findStoreById should not even be called since we bail early
    expect(PgStoreRepository.findStoreById).not.toHaveBeenCalled();
  });

  it('should succeed when invoiceService.create throws an unexpected error', async () => {
    mockUseCaseExecute(ORDER_STATUS.DELIVERED);
    mockStoreWithAutoInvoice(true);
    vi.mocked(PgStoreRepository.getOwnerUserId).mockResolvedValue(OWNER_USER_ID);
    invoiceService.create.mockRejectedValue(new Error('Unexpected DB failure'));

    const service = new OrderService(undefined, undefined, undefined, invoiceService);
    const result = await service.updateStatus(STORE_ID, ORDER_ID, ORDER_STATUS.DELIVERED);

    expect(result.status).toBe(ORDER_STATUS.DELIVERED);
  });

  it('should not trigger autoGenerateInvoice for non-DELIVERED statuses', async () => {
    mockUseCaseExecute(ORDER_STATUS.READY, ORDER_STATUS.IN_PROGRESS);

    const service = new OrderService(undefined, undefined, undefined, invoiceService);
    const result = await service.updateStatus(STORE_ID, ORDER_ID, ORDER_STATUS.READY);

    expect(result.status).toBe(ORDER_STATUS.READY);
    expect(PgStoreRepository.findStoreById).not.toHaveBeenCalled();
    expect(invoiceService.create).not.toHaveBeenCalled();
  });
});
