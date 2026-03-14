import type { CreateOrderDTO, Order, OrderStatus, UpdateOrderDTO } from './order.types.js';
import type { CustomerOrderFilters } from './order.repository.js';
import { ORDER_STATUS } from './order.types.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { OrderCrud } from './orderCrud.js';
import { UpdateOrderStatusUseCase } from './use-cases/updateOrderStatus.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { getPool } from '../../core/database/postgres.js';
import type { RecipeService } from '../recipes/recipe.service.js';
import type { InventoryService } from '../inventory/inventory.service.js';
import type { InvoiceService } from '../invoices/invoice.service.js';
import { ErrorCode, InventoryLogType, MAX_RECURRING_OCCURRENCES, OWNER_CANCELLABLE_STATUSES, CUSTOMER_DIRECT_CANCEL_STATUSES, CUSTOMER_REQUEST_CANCEL_STATUSES } from '@mise/shared';
import { PgStoreRepository } from '../stores/store.repository.js';
import { unitConversionFactor } from '../shared/unitConversion.js';
import { CustomerCrud } from '../customers/customerCrud.js';
import { PgOrderNotificationRepository } from './order-notification.repository.js';
import { getNotificationMessage } from './order-notification.messages.js';
import { PaymentCrud } from '../payments/paymentCrud.js';
import type { PayPalOrdersService } from '../storefront/paypal-orders.service.js';
import { appLogger } from '../../core/logger/logger.js';

/**
 * Extract a PayPal capture ID from a payment's notes field.
 *
 * FRAGILE: The capture ID is stored as a human-readable prefix in the `notes`
 * column (e.g. "PayPal Transaction: <captureId>"). If the prefix wording ever
 * changes, or additional text is appended, this will silently break refunds.
 * Ideally the capture ID should be stored in a dedicated column. This helper
 * centralises the parsing so there is a single place to update.
 */
export function extractPayPalCaptureId(notes: string | null): string | null {
  if (!notes) return null;
  const prefix = 'PayPal Transaction: ';
  if (!notes.startsWith(prefix)) return null;
  const id = notes.slice(prefix.length).trim();
  return id || null;
}

export class OrderService {
  private updateOrderStatusUseCase = new UpdateOrderStatusUseCase();

  constructor(
    private recipeService?: RecipeService,
    private inventoryService?: InventoryService,
    private paypalOrders?: PayPalOrdersService,
    private invoiceService?: InvoiceService,
  ) {}

  async getById(storeId: number, id: number): Promise<Order> {
    const order = await OrderCrud.getById(storeId, id);
    if (!order) throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);
    return order;
  }

  async getByCustomerId(storeId: number, customerId: number, options?: { limit: number; offset: number }, filters?: CustomerOrderFilters): Promise<{ orders: Order[]; total: number }> {
    return OrderCrud.findByCustomerId(storeId, customerId, options, filters);
  }

  async getAll(storeId: number, filters?: { status?: OrderStatus; excludePaid?: boolean }): Promise<Order[]> {
    return OrderCrud.getAll(storeId, filters);
  }

  async getAllPaginated(storeId: number, options: { limit: number; offset: number }, filters?: { status?: OrderStatus; excludePaid?: boolean; dateFrom?: string; dateTo?: string; search?: string }): Promise<{ orders: Order[]; total: number }> {
    return OrderCrud.getAllPaginated(storeId, options, filters);
  }

  async create(storeId: number, data: CreateOrderDTO & { recurringGroupId?: number }, correlationId?: string): Promise<Order> {
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

    const eventPayload: Record<string, unknown> = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customer.id,
      customerName: order.customer.name,
      total: order.totalAmount,
      storeId,
      items: order.items.map((i) => ({
        name: (i as any).recipeName || i.recipeId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    };

    const customer = order.customer.id ? await CustomerCrud.getById(order.customer.id, storeId) : null;
    if (customer) {
      eventPayload['customerPhone'] = customer.phone;
      eventPayload['customerEmail'] = customer.email;
    }

    await getEventBus().publish({
      eventName: EventNames.ORDER_CREATED,
      payload: eventPayload,
      timestamp: new Date(),
      correlationId,
    });

    return order;
  }

  async createBatch(
    storeId: number,
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
      throw new ValidationError('No occurrences match the selected days within the date range', ErrorCode.ORDER_NO_OCCURRENCES);
    }

    const pool = getPool();
    const seqResult = await pool.query("SELECT nextval('recurring_group_id_seq')::integer AS id");
    const recurringGroupId = seqResult.rows[0].id as number;
    const orders: Order[] = [];
    for (const date of occurrenceDates) {
      const order = await this.create(storeId, { ...data, dueDate: date, recurringGroupId }, correlationId);
      orders.push(order);
    }

    return orders;
  }

  async updateStatus(storeId: number, id: number, status: OrderStatus, correlationId?: string): Promise<Order> {
    const { order, previousStatus } = await this.updateOrderStatusUseCase.execute(storeId, id, status);

    if (previousStatus === ORDER_STATUS.IN_PROGRESS && status === ORDER_STATUS.READY) {
      await this.adjustInventoryForOrder(storeId, order, InventoryLogType.USAGE);
    } else if (previousStatus === ORDER_STATUS.READY && status === ORDER_STATUS.IN_PROGRESS) {
      await this.adjustInventoryForOrder(storeId, order, InventoryLogType.ADDITION);
    }

    // Create notification for status change
    await this.createNotification(storeId, order, previousStatus as number, status as number);

    // Auto-generate invoice on delivery
    if (status === ORDER_STATUS.DELIVERED) {
      await this.autoGenerateInvoice(storeId, id);
    }

    return order;
  }

  async approveOrder(storeId: number, id: number, correlationId?: string): Promise<Order> {
    const order = await OrderCrud.approveOrder(storeId, id);
    if (!order) {
      const existing = await OrderCrud.getById(storeId, id);
      if (!existing) throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);
      throw new ValidationError('Order is not pending approval', ErrorCode.ORDER_INVALID_STATUS_TRANSITION);
    }

    await this.createNotification(storeId, order, ORDER_STATUS.PENDING_APPROVAL, ORDER_STATUS.RECEIVED);

    await getEventBus().publish({
      eventName: EventNames.ORDER_STATUS_CHANGED,
      payload: { orderId: id, storeId, fromStatus: ORDER_STATUS.PENDING_APPROVAL, toStatus: ORDER_STATUS.RECEIVED, source: order.source },
      timestamp: new Date(),
      correlationId,
    });

    return order;
  }

  async cancelOrder(
    storeId: number,
    id: number,
    reason?: string,
    actor: 'owner' | 'customer' = 'owner',
    correlationId?: string,
  ): Promise<Order> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);

    const allowed = actor === 'owner'
      ? (OWNER_CANCELLABLE_STATUSES as readonly number[])
      : (CUSTOMER_DIRECT_CANCEL_STATUSES as readonly number[]);
    if (!allowed.includes(existing.status as number)) {
      throw new ValidationError(
        `Cannot cancel order in status ${existing.status}`,
        ErrorCode.ORDER_INVALID_STATUS_TRANSITION,
      );
    }

    const order = await OrderCrud.cancelOrder(storeId, id, existing.status as number, reason);
    if (!order) {
      throw new ValidationError('Order status changed concurrently, please retry', ErrorCode.ORDER_INVALID_STATUS_TRANSITION);
    }

    await this.processRefundIfNeeded(storeId, order);
    await this.createNotification(storeId, order, existing.status as number, ORDER_STATUS.CANCELLED);

    await getEventBus().publish({
      eventName: EventNames.ORDER_STATUS_CHANGED,
      payload: { orderId: id, storeId, fromStatus: existing.status, toStatus: ORDER_STATUS.CANCELLED, reason, actor, source: order.source },
      timestamp: new Date(),
      correlationId,
    });

    return order;
  }

  async requestCancellation(
    storeId: number,
    id: number,
    reason?: string,
    correlationId?: string,
  ): Promise<Order> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);

    if (!(CUSTOMER_REQUEST_CANCEL_STATUSES as readonly number[]).includes(existing.status as number)) {
      throw new ValidationError(
        `Cannot request cancellation in status ${existing.status}`,
        ErrorCode.ORDER_INVALID_STATUS_TRANSITION,
      );
    }

    const order = await OrderCrud.requestCancellation(storeId, id, existing.status as number, reason);
    if (!order) {
      throw new ValidationError('Order status changed concurrently, please retry', ErrorCode.ORDER_INVALID_STATUS_TRANSITION);
    }

    await this.createNotification(storeId, order, existing.status as number, ORDER_STATUS.CANCELLATION_REQUESTED);

    await getEventBus().publish({
      eventName: EventNames.ORDER_CANCELLATION_REQUESTED,
      payload: { orderId: id, storeId, fromStatus: existing.status, reason, source: order.source },
      timestamp: new Date(),
      correlationId,
    });

    return order;
  }

  async approveCancellationRequest(
    storeId: number,
    id: number,
    reason?: string,
    correlationId?: string,
  ): Promise<Order> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);
    if (existing.status !== ORDER_STATUS.CANCELLATION_REQUESTED) {
      throw new ValidationError('Order does not have a pending cancellation request', ErrorCode.ORDER_INVALID_STATUS_TRANSITION);
    }

    const order = await OrderCrud.cancelOrder(storeId, id, ORDER_STATUS.CANCELLATION_REQUESTED, reason || existing.cancellationReason);
    if (!order) {
      throw new ValidationError('Order status changed concurrently', ErrorCode.ORDER_INVALID_STATUS_TRANSITION);
    }

    await this.processRefundIfNeeded(storeId, order);
    await this.createNotification(storeId, order, ORDER_STATUS.CANCELLATION_REQUESTED, ORDER_STATUS.CANCELLED);

    await getEventBus().publish({
      eventName: EventNames.ORDER_STATUS_CHANGED,
      payload: { orderId: id, storeId, fromStatus: ORDER_STATUS.CANCELLATION_REQUESTED, toStatus: ORDER_STATUS.CANCELLED, source: order.source },
      timestamp: new Date(),
      correlationId,
    });

    return order;
  }

  async declineCancellationRequest(
    storeId: number,
    id: number,
    correlationId?: string,
  ): Promise<Order> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);
    if (existing.status !== ORDER_STATUS.CANCELLATION_REQUESTED) {
      throw new ValidationError('Order does not have a pending cancellation request', ErrorCode.ORDER_INVALID_STATUS_TRANSITION);
    }

    const order = await OrderCrud.declineCancellation(storeId, id);
    if (!order) {
      throw new ValidationError('Failed to decline cancellation request', ErrorCode.ORDER_INVALID_STATUS_TRANSITION);
    }

    // Create notification (decline is special — use declined flag)
    await PgOrderNotificationRepository.create({
      orderId: order.id,
      storeId,
      customerId: order.customer.id,
      statusFrom: ORDER_STATUS.CANCELLATION_REQUESTED,
      statusTo: order.status as number,
      message: getNotificationMessage(ORDER_STATUS.CANCELLATION_REQUESTED, order.status as number, true),
    });

    await getEventBus().publish({
      eventName: EventNames.ORDER_STATUS_CHANGED,
      payload: { orderId: id, storeId, fromStatus: ORDER_STATUS.CANCELLATION_REQUESTED, toStatus: order.status, source: order.source },
      timestamp: new Date(),
      correlationId,
    });

    return order;
  }

  async getPendingCount(storeId: number): Promise<{ pendingApproval: number; cancellationRequested: number }> {
    return OrderCrud.countPendingActions(storeId);
  }

  private async createNotification(storeId: number, order: Order, fromStatus: number, toStatus: number): Promise<void> {
    await PgOrderNotificationRepository.create({
      orderId: order.id,
      storeId,
      customerId: order.customer.id,
      statusFrom: fromStatus,
      statusTo: toStatus,
      message: getNotificationMessage(fromStatus, toStatus),
    });
  }

  private async processRefundIfNeeded(storeId: number, order: Order): Promise<void> {
    const payments = await PaymentCrud.getByOrderId(storeId, order.id);
    const completedPayments = payments.filter((p) => p.status === 'completed');

    if (completedPayments.length === 0) return;

    for (const payment of completedPayments) {
      if (payment.method === 'paypal') {
        const captureId = extractPayPalCaptureId(payment.notes ?? null);
        if (captureId && this.paypalOrders) {
          try {
            await this.paypalOrders.refundCapture(captureId);
          } catch (err) {
            appLogger.error({ err, paymentId: payment.id, captureId }, 'PayPal refund failed');
            continue;
          }
        }
      }
      // Mark non-cash payments as refunded.
      // PayPal payments only reach here if the refund API call above succeeded
      // (failures trigger `continue`, skipping this block).
      // Cash payments are left as 'completed' — the store owner handles manually.
      if (payment.method !== 'cash') {
        await PaymentCrud.refund(storeId, payment.id);
      }
    }
  }

  private async autoGenerateInvoice(storeId: number, orderId: number): Promise<void> {
    if (!this.invoiceService) return;

    try {
      const store = await PgStoreRepository.findStoreById(storeId);
      if (!store?.autoGenerateInvoice) return;

      const ownerUserId = await PgStoreRepository.getOwnerUserId(storeId);
      if (!ownerUserId) {
        appLogger.warn({ storeId, orderId }, 'Auto-invoice skipped: no store owner found');
        return;
      }

      await this.invoiceService.create(storeId, ownerUserId, { orderId });
      appLogger.info({ storeId, orderId }, 'Auto-invoice created on delivery');
    } catch (err: any) {
      if (err?.errorCode === ErrorCode.INVOICE_ALREADY_EXISTS) {
        appLogger.debug({ storeId, orderId }, 'Auto-invoice skipped: invoice already exists');
      } else if (err?.errorCode === ErrorCode.INVOICE_STORE_MISSING_TAX) {
        appLogger.debug({ storeId, orderId }, 'Auto-invoice skipped: store missing tax number');
      } else {
        appLogger.warn({ err, storeId, orderId }, 'Auto-invoice failed (non-blocking)');
      }
    }
  }

  private async adjustInventoryForOrder(storeId: number, order: Order, type: InventoryLogType): Promise<void> {
    if (!this.recipeService || !this.inventoryService) return;

    const adjustedIngredients: { ingredientId: number; name: string; currentQuantity: number; threshold: number; unit: string }[] = [];

    for (const item of order.items) {
      try {
        const recipe = await this.recipeService.getById(storeId, item.recipeId);
        if (!recipe.ingredients) continue;

        for (const ingredient of recipe.ingredients) {
          try {
            const inventoryItem = await this.inventoryService.getById(storeId, Number(ingredient.ingredientId));
            const factor = unitConversionFactor(ingredient.unit, inventoryItem.unit);
            const convertedQty = ingredient.quantity * factor * item.quantity;

            const updated = await this.inventoryService.adjustStock(storeId, {
              ingredientId: Number(ingredient.ingredientId),
              type,
              quantity: convertedQty,
              reason: `Order ${order.id}`,
            }, undefined, { suppressEvent: true });

            if (updated && updated.quantity <= updated.lowStockThreshold) {
              adjustedIngredients.push({
                ingredientId: updated.id,
                name: updated.name,
                currentQuantity: updated.quantity,
                threshold: updated.lowStockThreshold,
                unit: updated.unit,
              });
            }
          } catch {
            // skip if inventory item not found
          }
        }
      } catch {
        // skip if recipe not found
      }
    }

    if (adjustedIngredients.length > 0) {
      await getEventBus().publish({
        eventName: EventNames.INVENTORY_LOW_STOCK,
        payload: { items: adjustedIngredients },
        timestamp: new Date(),
      });
    }
  }

  async getByDateRange(storeId: number, filters: { from: string; to: string; status?: number }): Promise<Order[]> {
    return OrderCrud.findByDateRange(storeId, filters);
  }

  async getCalendarAggregates(storeId: number, filters: { from: string; to: string }): Promise<Array<{ day: string; total: number; pendingApproval: number; received: number; inProgress: number; ready: number; delivered: number }>> {
    return OrderCrud.getCalendarAggregates(storeId, filters);
  }

  async getByDay(storeId: number, filters: { date: string; status?: number; limit: number; offset: number }): Promise<{ orders: Order[]; total: number }> {
    return OrderCrud.findByDay(storeId, filters);
  }

  async update(storeId: number, id: number, data: UpdateOrderDTO): Promise<Order> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);

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

  async updateFutureRecurring(storeId: number, id: number, data: UpdateOrderDTO): Promise<{ updated: Order; futureUpdated: number }> {
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

  async delete(storeId: number, id: number): Promise<void> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);
    }
    if (existing.status === ORDER_STATUS.RECEIVED) {
      throw new ValidationError('Cannot delete orders with received status', ErrorCode.ORDER_CANNOT_DELETE_RECEIVED);
    }
    return OrderCrud.delete(storeId, id);
  }
}
