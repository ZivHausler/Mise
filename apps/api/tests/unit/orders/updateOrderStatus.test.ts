import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateOrderStatusUseCase } from '../../../src/modules/orders/use-cases/updateOrderStatus.js';
import { createOrder } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import { ORDER_STATUS } from '../../../src/modules/orders/order.types.js';

vi.mock('@mise/shared/src/constants/index.js', () => ({
  ORDER_STATUS_FLOW: {
    0: [1],    // received → in_progress
    1: [0, 2], // in_progress → received, ready
    2: [1, 3], // ready → in_progress, delivered
    3: [2],    // delivered → ready
  },
}));

vi.mock('../../../src/modules/orders/crud/orderCrud.js', () => ({
  OrderCrud: {
    getById: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

import { OrderCrud } from '../../../src/modules/orders/crud/orderCrud.js';

const STORE_ID = 'store-1';

describe('UpdateOrderStatusUseCase', () => {
  let useCase: UpdateOrderStatusUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new UpdateOrderStatusUseCase();
  });

  it('should transition from received to in_progress', async () => {
    const existing = createOrder({ status: ORDER_STATUS.RECEIVED });
    const updated = createOrder({ status: ORDER_STATUS.IN_PROGRESS });
    vi.mocked(OrderCrud.getById).mockResolvedValue(existing);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(updated);

    const result = await useCase.execute(STORE_ID, 'order-1', ORDER_STATUS.IN_PROGRESS);

    expect(result.order.status).toBe(ORDER_STATUS.IN_PROGRESS);
    expect(result.previousStatus).toBe(ORDER_STATUS.RECEIVED);
    expect(OrderCrud.updateStatus).toHaveBeenCalledWith(STORE_ID, 'order-1', ORDER_STATUS.IN_PROGRESS);
  });

  it('should transition from in_progress to ready', async () => {
    vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.IN_PROGRESS }));
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY }));

    const result = await useCase.execute(STORE_ID, 'order-1', ORDER_STATUS.READY);
    expect(result.order.status).toBe(ORDER_STATUS.READY);
    expect(result.previousStatus).toBe(ORDER_STATUS.IN_PROGRESS);
  });

  it('should transition from ready to delivered', async () => {
    vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY }));
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.DELIVERED }));

    const result = await useCase.execute(STORE_ID, 'order-1', ORDER_STATUS.DELIVERED);
    expect(result.order.status).toBe(ORDER_STATUS.DELIVERED);
    expect(result.previousStatus).toBe(ORDER_STATUS.READY);
  });

  it('should reject invalid transition from received to ready', async () => {
    vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));

    await expect(
      useCase.execute(STORE_ID, 'order-1', ORDER_STATUS.READY),
    ).rejects.toThrow(ValidationError);
  });

  it('should reject skipping status (received to delivered)', async () => {
    vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));

    await expect(
      useCase.execute(STORE_ID, 'order-1', ORDER_STATUS.DELIVERED),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw NotFoundError when order does not exist', async () => {
    vi.mocked(OrderCrud.getById).mockResolvedValue(null);

    await expect(
      useCase.execute(STORE_ID, 'nonexistent', ORDER_STATUS.IN_PROGRESS),
    ).rejects.toThrow(NotFoundError);
  });
});
