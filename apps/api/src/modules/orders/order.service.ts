import type { CreateOrderDTO, Order, OrderStatus } from './order.types.js';
import type { CustomerOrderFilters } from './order.repository.js';
import { ORDER_STATUS } from './order.types.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { OrderCrud } from './orderCrud.js';
import { UpdateOrderStatusUseCase } from './use-cases/updateOrderStatus.js';
import { GetOrdersByCustomerUseCase } from './use-cases/getOrdersByCustomer.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import type { RecipeService } from '../recipes/recipe.service.js';
import type { InventoryService } from '../inventory/inventory.service.js';
import { InventoryLogType } from '@mise/shared';
import { unitConversionFactor } from '../shared/unitConversion.js';

export class OrderService {
  private updateOrderStatusUseCase = new UpdateOrderStatusUseCase();
  private getOrdersByCustomerUseCase = new GetOrdersByCustomerUseCase();

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
    return this.getOrdersByCustomerUseCase.execute(storeId, customerId, options, filters);
  }

  async getAll(storeId: string, filters?: { status?: OrderStatus; excludePaid?: boolean }): Promise<Order[]> {
    return OrderCrud.getAll(storeId, filters);
  }

  async create(storeId: string, data: CreateOrderDTO): Promise<Order> {
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
      eventName: 'order.created',
      payload: { orderId: order.id, customerId: order.customerId },
      timestamp: new Date(),
    });

    return order;
  }

  async updateStatus(storeId: string, id: string, status: OrderStatus): Promise<Order> {
    const { order, previousStatus } = await this.updateOrderStatusUseCase.execute(storeId, id, status);

    if (previousStatus === ORDER_STATUS.IN_PROGRESS && status === ORDER_STATUS.READY) {
      await this.adjustInventoryForOrder(storeId, order, InventoryLogType.USAGE);
    } else if (previousStatus === ORDER_STATUS.READY && status === ORDER_STATUS.IN_PROGRESS) {
      await this.adjustInventoryForOrder(storeId, order, InventoryLogType.ADDITION);
    }

    await getEventBus().publish({
      eventName: 'order.statusChanged',
      payload: { orderId: id, previousStatus, newStatus: status },
      timestamp: new Date(),
    });

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

  async update(storeId: string, id: string, data: Partial<Order>): Promise<Order> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Order not found');
    return OrderCrud.update(storeId, id, data);
  }

  async delete(storeId: string, id: string): Promise<void> {
    return OrderCrud.delete(storeId, id);
  }
}
