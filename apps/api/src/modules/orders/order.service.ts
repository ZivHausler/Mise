import type { CreateOrderDTO, Order, OrderStatus, UpdateOrderDTO } from './order.types.js';
import type { CustomerOrderFilters } from './order.repository.js';
import { ORDER_STATUS } from './order.types.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { OrderCrud } from './orderCrud.js';
import { UpdateOrderStatusUseCase } from './use-cases/updateOrderStatus.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { randomUUID } from 'crypto';
import type { RecipeService } from '../recipes/recipe.service.js';
import type { InventoryService } from '../inventory/inventory.service.js';
import { InventoryLogType, MAX_RECURRING_OCCURRENCES } from '@mise/shared';
import { unitConversionFactor } from '../shared/unitConversion.js';

export class OrderService {
  private updateOrderStatusUseCase = new UpdateOrderStatusUseCase();

  constructor(
    private recipeService?: RecipeService,
    private inventoryService?: InventoryService,
  ) {}

  async getById(storeId: string, id: string): Promise<Order> {
    const order = await OrderCrud.getById(storeId, id);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async getByCustomerId(storeId: string, customerId: string, options?: { limit: number; offset: number }, filters?: CustomerOrderFilters): Promise<{ orders: Order[]; total: number }> {
    return OrderCrud.findByCustomerId(storeId, customerId, options, filters);
  }

  async getAll(storeId: string, filters?: { status?: OrderStatus; excludePaid?: boolean }): Promise<Order[]> {
    return OrderCrud.getAll(storeId, filters);
  }

  async create(storeId: string, data: CreateOrderDTO & { recurringGroupId?: string }, correlationId?: string): Promise<Order> {
    let totalAmount = 0;

    for (const item of data.items) {
      let unitPrice = (item as any).price ?? 0;
      let recipeName = (item as any).recipeName ?? '';

      if (this.recipeService) {
        try {
          const recipe = await this.recipeService.getById(storeId, item.recipeId);
          if (!unitPrice) unitPrice = recipe.sellingPrice ?? recipe.totalCost ?? 0;
          if (!recipeName) recipeName = recipe.name ?? '';
        } catch {
          // recipe not found, use frontend-provided values
        }
      }

      (item as any).unitPrice = unitPrice;
      (item as any).recipeName = recipeName;
      totalAmount += unitPrice * item.quantity;
    }

    const order = await OrderCrud.create(storeId, { ...data, totalAmount });

    await getEventBus().publish({
      eventName: EventNames.ORDER_CREATED,
      payload: { orderId: order.id, customerId: order.customerId, storeId },
      timestamp: new Date(),
      correlationId,
    });

    return order;
  }

  async createBatch(
    storeId: string,
    data: CreateOrderDTO,
    recurrence: { frequency: 'weekly'; daysOfWeek: number[]; endDate: string },
    correlationId?: string,
  ): Promise<Order[]> {
    const daysSet = new Set(recurrence.daysOfWeek);
    const startDate = data.dueDate ? new Date(data.dueDate) : new Date();
    const endDate = new Date(recurrence.endDate + 'T23:59:59');
    const occurrenceDates: Date[] = [];

    const current = new Date(startDate);
    while (current <= endDate && occurrenceDates.length < MAX_RECURRING_OCCURRENCES) {
      if (daysSet.has(current.getDay())) {
        occurrenceDates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (occurrenceDates.length === 0) {
      throw new ValidationError('No occurrences match the selected days within the date range');
    }

    const recurringGroupId = randomUUID();
    const orders: Order[] = [];
    for (const date of occurrenceDates) {
      const order = await this.create(storeId, { ...data, dueDate: date, recurringGroupId }, correlationId);
      orders.push(order);
    }

    return orders;
  }

  async updateStatus(storeId: string, id: string, status: OrderStatus, correlationId?: string): Promise<Order> {
    const { order, previousStatus } = await this.updateOrderStatusUseCase.execute(storeId, id, status);

    if (previousStatus === ORDER_STATUS.IN_PROGRESS && status === ORDER_STATUS.READY) {
      await this.adjustInventoryForOrder(storeId, order, InventoryLogType.USAGE);
    } else if (previousStatus === ORDER_STATUS.READY && status === ORDER_STATUS.IN_PROGRESS) {
      await this.adjustInventoryForOrder(storeId, order, InventoryLogType.ADDITION);
    }

    return order;
  }

  private async adjustInventoryForOrder(storeId: string, order: Order, type: InventoryLogType): Promise<void> {
    if (!this.recipeService || !this.inventoryService) return;

    for (const item of order.items) {
      try {
        const recipe = await this.recipeService.getById(storeId, item.recipeId);
        if (!recipe.ingredients) continue;

        for (const ingredient of recipe.ingredients) {
          try {
            const inventoryItem = await this.inventoryService.getById(storeId, ingredient.ingredientId);
            const factor = unitConversionFactor(ingredient.unit, inventoryItem.unit);
            const convertedQty = ingredient.quantity * factor * item.quantity;

            await this.inventoryService.adjustStock(storeId, {
              ingredientId: ingredient.ingredientId,
              type,
              quantity: convertedQty,
              reason: `Order ${order.id}`,
            });
          } catch {
            // skip if inventory item not found
          }
        }
      } catch {
        // skip if recipe not found
      }
    }
  }

  async getByDateRange(storeId: string, filters: { from: string; to: string; status?: number }): Promise<Order[]> {
    return OrderCrud.findByDateRange(storeId, filters);
  }

  async getCalendarAggregates(storeId: string, filters: { from: string; to: string }): Promise<Array<{ day: string; total: number; received: number; inProgress: number; ready: number; delivered: number }>> {
    return OrderCrud.getCalendarAggregates(storeId, filters);
  }

  async getByDay(storeId: string, filters: { date: string; status?: number; limit: number; offset: number }): Promise<{ orders: Order[]; total: number }> {
    return OrderCrud.findByDay(storeId, filters);
  }

  async update(storeId: string, id: string, data: UpdateOrderDTO): Promise<Order> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Order not found');

    const updateData: Partial<Order> = {};
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;

    if (data.items) {
      let totalAmount = 0;
      const resolvedItems = [];

      for (const item of data.items) {
        let unitPrice = item.price ?? 0;
        let recipeName = item.recipeName ?? '';

        if (this.recipeService) {
          try {
            const recipe = await this.recipeService.getById(storeId, item.recipeId);
            if (!unitPrice) unitPrice = recipe.sellingPrice ?? recipe.totalCost ?? 0;
            if (!recipeName) recipeName = recipe.name ?? '';
          } catch {
            // recipe not found, use provided values
          }
        }

        resolvedItems.push({ recipeId: item.recipeId, quantity: item.quantity, unitPrice, recipeName, notes: item.notes });
        totalAmount += unitPrice * item.quantity;
      }

      updateData.items = resolvedItems;
      updateData.totalAmount = totalAmount;
    }

    return OrderCrud.update(storeId, id, updateData);
  }

  async updateFutureRecurring(storeId: string, id: string, data: UpdateOrderDTO): Promise<{ updated: Order; futureUpdated: number }> {
    // First update the current order
    const updated = await this.update(storeId, id, data);

    // Find and update future siblings
    if (!updated.recurringGroupId || !updated.dueDate) {
      return { updated, futureUpdated: 0 };
    }

    const futureOrders = await OrderCrud.findFutureByRecurringGroup(storeId, updated.recurringGroupId, updated.dueDate);

    // Build the update payload (same items/notes, keep each order's own dueDate)
    const updatePayload: UpdateOrderDTO = {};
    if (data.items) updatePayload.items = data.items;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    let futureUpdated = 0;
    for (const futureOrder of futureOrders) {
      await this.update(storeId, futureOrder.id, updatePayload);
      futureUpdated++;
    }

    return { updated, futureUpdated };
  }

  async delete(storeId: string, id: string): Promise<void> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Order not found');
    }
    if (existing.status === ORDER_STATUS.RECEIVED) {
      throw new ValidationError('Cannot delete orders with received status');
    }
    return OrderCrud.delete(storeId, id);
  }
}
