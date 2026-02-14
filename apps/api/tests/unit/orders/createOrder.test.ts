import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateOrderUseCase } from '../../../src/modules/orders/use-cases/createOrder.js';
import { createMockOrderRepository, createOrder } from '../helpers/mock-factories.js';
import { ValidationError } from '../../../src/core/errors/app-error.js';
import type { IOrderRepository } from '../../../src/modules/orders/order.repository.js';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let repo: IOrderRepository;

  beforeEach(() => {
    repo = createMockOrderRepository();
    useCase = new CreateOrderUseCase(repo);
  });

  it('should create an order with valid data', async () => {
    const order = createOrder();
    vi.mocked(repo.create).mockResolvedValue(order);

    const result = await useCase.execute({
      customerId: 'cust-1',
      items: [{ recipeId: 'recipe-1', quantity: 2, unitPrice: 50 }],
      totalAmount: 100,
    });

    expect(result).toEqual(order);
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('should throw ValidationError when customerId is missing', async () => {
    await expect(
      useCase.execute({
        customerId: '',
        items: [{ recipeId: 'r1', quantity: 1, unitPrice: 10 }],
        totalAmount: 10,
      }),
    ).rejects.toThrow('Customer ID is required');
  });

  it('should throw ValidationError when items array is empty', async () => {
    await expect(
      useCase.execute({
        customerId: 'cust-1',
        items: [],
        totalAmount: 0,
      }),
    ).rejects.toThrow('At least one item is required');
  });

  it('should throw ValidationError when an item has zero quantity', async () => {
    await expect(
      useCase.execute({
        customerId: 'cust-1',
        items: [{ recipeId: 'r1', quantity: 0, unitPrice: 10 }],
        totalAmount: 0,
      }),
    ).rejects.toThrow('Item quantity must be positive');
  });

  it('should throw ValidationError when an item has negative quantity', async () => {
    await expect(
      useCase.execute({
        customerId: 'cust-1',
        items: [{ recipeId: 'r1', quantity: -1, unitPrice: 10 }],
        totalAmount: 0,
      }),
    ).rejects.toThrow('Item quantity must be positive');
  });

  it('should create order with multiple items', async () => {
    const order = createOrder({
      items: [
        { recipeId: 'r1', quantity: 2, unitPrice: 50 },
        { recipeId: 'r2', quantity: 1, unitPrice: 30 },
      ],
      totalAmount: 130,
    });
    vi.mocked(repo.create).mockResolvedValue(order);

    const result = await useCase.execute({
      customerId: 'cust-1',
      items: [
        { recipeId: 'r1', quantity: 2, unitPrice: 50 },
        { recipeId: 'r2', quantity: 1, unitPrice: 30 },
      ],
      totalAmount: 130,
    });

    expect(result.items).toHaveLength(2);
    expect(result.totalAmount).toBe(130);
  });

  it('should create order with notes and due date', async () => {
    const dueDate = new Date('2025-03-01');
    const order = createOrder({ notes: 'Rush order', dueDate });
    vi.mocked(repo.create).mockResolvedValue(order);

    const result = await useCase.execute({
      customerId: 'cust-1',
      items: [{ recipeId: 'r1', quantity: 1, unitPrice: 50 }],
      notes: 'Rush order',
      dueDate,
      totalAmount: 50,
    });

    expect(result.notes).toBe('Rush order');
    expect(result.dueDate).toEqual(dueDate);
  });
});
