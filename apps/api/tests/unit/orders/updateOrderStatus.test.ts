import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateOrderStatusUseCase } from '../../../src/modules/orders/use-cases/updateOrderStatus.js';
import { createMockOrderRepository, createOrder } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import type { IOrderRepository } from '../../../src/modules/orders/order.repository.js';

// Mock the shared constants
vi.mock('@mise/shared/src/constants/index.js', () => ({
  ORDER_STATUS_FLOW: {
    received: ['in_progress'],
    in_progress: ['ready'],
    ready: ['delivered'],
    delivered: [],
  },
}));

describe('UpdateOrderStatusUseCase', () => {
  let useCase: UpdateOrderStatusUseCase;
  let repo: IOrderRepository;

  beforeEach(() => {
    repo = createMockOrderRepository();
    useCase = new UpdateOrderStatusUseCase(repo);
  });

  it('should transition from received to in_progress', async () => {
    const existing = createOrder({ status: 'received' });
    const updated = createOrder({ status: 'in_progress' });
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.updateStatus).mockResolvedValue(updated);

    const result = await useCase.execute('order-1', 'in_progress');

    expect(result.order.status).toBe('in_progress');
    expect(result.previousStatus).toBe('received');
    expect(repo.updateStatus).toHaveBeenCalledWith('order-1', 'in_progress');
  });

  it('should transition from in_progress to ready', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'in_progress' }));
    vi.mocked(repo.updateStatus).mockResolvedValue(createOrder({ status: 'ready' }));

    const result = await useCase.execute('order-1', 'ready');
    expect(result.order.status).toBe('ready');
    expect(result.previousStatus).toBe('in_progress');
  });

  it('should transition from ready to delivered', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'ready' }));
    vi.mocked(repo.updateStatus).mockResolvedValue(createOrder({ status: 'delivered' }));

    const result = await useCase.execute('order-1', 'delivered');
    expect(result.order.status).toBe('delivered');
    expect(result.previousStatus).toBe('ready');
  });

  it('should reject invalid transition from received to ready', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'received' }));

    await expect(
      useCase.execute('order-1', 'ready'),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute('order-1', 'ready'),
    ).rejects.toThrow('Cannot transition from "received" to "ready"');
  });

  it('should reject invalid transition from delivered to received', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'delivered' }));

    await expect(
      useCase.execute('order-1', 'received'),
    ).rejects.toThrow(ValidationError);
  });

  it('should reject transition from delivered to any status', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'delivered' }));

    await expect(useCase.execute('order-1', 'in_progress')).rejects.toThrow(ValidationError);
    await expect(useCase.execute('order-1', 'ready')).rejects.toThrow(ValidationError);
    await expect(useCase.execute('order-1', 'received')).rejects.toThrow(ValidationError);
  });

  it('should reject skipping status (received to delivered)', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'received' }));

    await expect(
      useCase.execute('order-1', 'delivered'),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw NotFoundError when order does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute('nonexistent', 'in_progress'),
    ).rejects.toThrow(NotFoundError);
  });
});
