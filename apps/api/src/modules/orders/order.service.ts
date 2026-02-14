import type { IOrderRepository } from './order.repository.js';
import type { CreateOrderDTO, Order, OrderStatus } from './order.types.js';
import type { EventBus } from '../../core/events/event-bus.js';
import { CreateOrderUseCase } from './use-cases/createOrder.js';
import { UpdateOrderStatusUseCase } from './use-cases/updateOrderStatus.js';
import { GetOrdersByCustomerUseCase } from './use-cases/getOrdersByCustomer.js';
import { DeleteOrderUseCase } from './use-cases/deleteOrder.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import type { RecipeService } from '../recipes/recipe.service.js';

export class OrderService {
  private createOrderUseCase: CreateOrderUseCase;
  private updateOrderStatusUseCase: UpdateOrderStatusUseCase;
  private getOrdersByCustomerUseCase: GetOrdersByCustomerUseCase;
  private deleteOrderUseCase: DeleteOrderUseCase;

  constructor(
    private orderRepository: IOrderRepository,
    private eventBus: EventBus,
    private recipeService?: RecipeService,
  ) {
    this.createOrderUseCase = new CreateOrderUseCase(orderRepository);
    this.updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepository);
    this.getOrdersByCustomerUseCase = new GetOrdersByCustomerUseCase(orderRepository);
    this.deleteOrderUseCase = new DeleteOrderUseCase(orderRepository);
  }

  async getById(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async getByCustomerId(customerId: string): Promise<Order[]> {
    return this.getOrdersByCustomerUseCase.execute(customerId);
  }

  async getAll(filters?: { status?: OrderStatus }): Promise<Order[]> {
    return this.orderRepository.findAll(filters);
  }

  async create(data: CreateOrderDTO): Promise<Order> {
    let totalAmount = 0;

    // Calculate total from recipe prices
    if (this.recipeService) {
      for (const item of data.items) {
        try {
          const recipe = await this.recipeService.getById(item.recipeId);
          const unitPrice = recipe.sellingPrice ?? recipe.totalCost ?? 0;
          (item as any).unitPrice = unitPrice;
          totalAmount += unitPrice * item.quantity;
        } catch {
          (item as any).unitPrice = 0;
        }
      }
    }

    const order = await this.createOrderUseCase.execute({ ...data, totalAmount });

    await this.eventBus.publish({
      eventName: 'order.created',
      payload: { orderId: order.id, customerId: order.customerId },
      timestamp: new Date(),
    });

    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const { order, previousStatus } = await this.updateOrderStatusUseCase.execute(id, status);

    await this.eventBus.publish({
      eventName: 'order.statusChanged',
      payload: { orderId: id, previousStatus, newStatus: status },
      timestamp: new Date(),
    });

    return order;
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const existing = await this.orderRepository.findById(id);
    if (!existing) throw new NotFoundError('Order not found');
    return this.orderRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.deleteOrderUseCase.execute(id);
  }
}
