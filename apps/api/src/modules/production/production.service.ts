import type { ProductionBatch, ProductionStage, CreateBatchDTO, UpdateBatchDTO } from './production.types.js';
import { PRODUCTION_STAGE } from './production.types.js';
import { ProductionCrud } from './productionCrud.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { ProductionEventNames } from './production.events.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import type { RecipeService } from '../recipes/recipe.service.js';
import type { InventoryService } from '../inventory/inventory.service.js';
import { OrderCrud } from '../orders/orderCrud.js';
import { ORDER_STATUS } from '../orders/order.types.js';

export class ProductionService {
  constructor(
    private recipeService?: RecipeService,
    private inventoryService?: InventoryService,
  ) {}

  async getBatchesByDate(storeId: number, date: string): Promise<ProductionBatch[]> {
    return ProductionCrud.findByDate(storeId, date);
  }

  async getBatchById(storeId: number, id: number): Promise<ProductionBatch> {
    const batch = await ProductionCrud.findById(storeId, id);
    if (!batch) throw new NotFoundError('Production batch not found');
    return batch;
  }

  async createBatch(storeId: number, data: CreateBatchDTO): Promise<ProductionBatch> {
    let recipeName = data.recipeName ?? '';
    if (!recipeName && this.recipeService) {
      try {
        const recipe = await this.recipeService.getById(storeId, data.recipeId);
        recipeName = recipe.name;
      } catch {
        // recipe not found, use empty name
      }
    }

    const batch = await ProductionCrud.create(storeId, {
      recipeId: data.recipeId,
      recipeName,
      quantity: data.quantity,
      productionDate: data.productionDate,
      priority: data.priority ?? 0,
      assignedTo: data.assignedTo,
      source: 'manual',
      notes: data.notes,
    });

    // Create prep items from recipe ingredients
    await this.createPrepItemsForBatch(storeId, batch);

    await getEventBus().publish({
      eventName: ProductionEventNames.BATCH_CREATED,
      payload: { batchId: batch.id, recipeId: batch.recipeId },
      timestamp: new Date(),
    });

    return batch;
  }

  async generateBatches(storeId: number, date: string): Promise<ProductionBatch[]> {
    // 1. Query all orders with due_date on target date
    const orders = await OrderCrud.findByDateRange(storeId, { from: date, to: date });
    // Filter to only received/in_progress orders
    const eligibleOrders = orders.filter((o) => o.status === ORDER_STATUS.RECEIVED || o.status === ORDER_STATUS.IN_PROGRESS);

    if (eligibleOrders.length === 0) return [];

    // 2. Group order items by recipeId, sum quantities
    const recipeGroups = new Map<string, { recipeId: string; totalQuantity: number; orderSources: { orderId: number; itemIndex: number; quantity: number }[] }>();

    for (const order of eligibleOrders) {
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i]!;
        const key = item.recipeId;
        if (!recipeGroups.has(key)) {
          recipeGroups.set(key, { recipeId: item.recipeId, totalQuantity: 0, orderSources: [] });
        }
        const group = recipeGroups.get(key)!;
        group.totalQuantity += item.quantity;
        group.orderSources.push({ orderId: order.id, itemIndex: i, quantity: item.quantity });
      }
    }

    // 3. Create one production_batch per recipe group
    const batches: ProductionBatch[] = [];
    for (const group of recipeGroups.values()) {
      let recipeName = '';
      if (this.recipeService) {
        try {
          const recipe = await this.recipeService.getById(storeId, group.recipeId);
          recipeName = recipe.name;
        } catch {
          // skip
        }
      }

      const batch = await ProductionCrud.create(storeId, {
        recipeId: group.recipeId,
        recipeName,
        quantity: group.totalQuantity,
        productionDate: date,
        priority: 0,
        source: 'auto',
      });

      // 4. Create batch_orders junction records
      for (const src of group.orderSources) {
        await ProductionCrud.createBatchOrder(storeId, {
          batchId: batch.id,
          orderId: src.orderId,
          orderItemIndex: src.itemIndex,
          quantityFromOrder: src.quantity,
        });
      }

      // 5. Create batch_prep_items from recipe ingredients
      await this.createPrepItemsForBatch(storeId, batch);

      batches.push(batch);

      await getEventBus().publish({
        eventName: ProductionEventNames.BATCH_CREATED,
        payload: { batchId: batch.id, recipeId: batch.recipeId },
        timestamp: new Date(),
      });
    }

    return batches;
  }

  async updateStage(storeId: number, id: number, stage: ProductionStage): Promise<ProductionBatch> {
    const existing = await ProductionCrud.findById(storeId, id);
    if (!existing) throw new NotFoundError('Production batch not found');

    const batch = await ProductionCrud.updateStage(storeId, id, stage);

    await getEventBus().publish({
      eventName: ProductionEventNames.BATCH_STAGE_CHANGED,
      payload: { batchId: batch.id, previousStage: existing.stage, newStage: stage },
      timestamp: new Date(),
    });

    if (stage === PRODUCTION_STAGE.PACKAGED) {
      await getEventBus().publish({
        eventName: ProductionEventNames.BATCH_COMPLETED,
        payload: { batchId: batch.id },
        timestamp: new Date(),
      });
    }

    return batch;
  }

  async updateBatch(storeId: number, id: number, data: UpdateBatchDTO): Promise<ProductionBatch> {
    const existing = await ProductionCrud.findById(storeId, id);
    if (!existing) throw new NotFoundError('Production batch not found');
    return ProductionCrud.update(storeId, id, data);
  }

  async deleteBatch(storeId: number, id: number): Promise<void> {
    const existing = await ProductionCrud.findById(storeId, id);
    if (!existing) throw new NotFoundError('Production batch not found');
    return ProductionCrud.delete(storeId, id);
  }

  async splitBatch(storeId: number, id: number, splitQuantity: number): Promise<{ original: ProductionBatch; newBatch: ProductionBatch }> {
    const existing = await ProductionCrud.findById(storeId, id);
    if (!existing) throw new NotFoundError('Production batch not found');

    if (splitQuantity >= existing.quantity) {
      throw new ValidationError('Split quantity must be less than current batch quantity');
    }

    // Reduce original batch
    const original = await ProductionCrud.update(storeId, id, { quantity: existing.quantity - splitQuantity });

    // Create new batch with split quantity
    const newBatch = await ProductionCrud.create(storeId, {
      recipeId: existing.recipeId,
      recipeName: existing.recipeName,
      quantity: splitQuantity,
      productionDate: existing.productionDate,
      priority: existing.priority,
      assignedTo: existing.assignedTo,
      source: existing.source,
      notes: existing.notes,
    });

    // Update stage to match original
    const updatedNewBatch = existing.stage > 0
      ? await ProductionCrud.updateStage(storeId, newBatch.id, existing.stage)
      : newBatch;

    // Create prep items for the new batch
    await this.createPrepItemsForBatch(storeId, updatedNewBatch);

    return { original, newBatch: updatedNewBatch };
  }

  async mergeBatches(storeId: number, batchIds: number[]): Promise<ProductionBatch> {
    const batches: ProductionBatch[] = [];
    for (const bId of batchIds) {
      const b = await ProductionCrud.findById(storeId, bId);
      if (!b) throw new NotFoundError(`Production batch ${bId} not found`);
      batches.push(b);
    }

    // Validate all batches have same recipe and date
    const first = batches[0]!;
    const recipeId = first.recipeId;
    const productionDate = first.productionDate;
    for (const b of batches) {
      if (b.recipeId !== recipeId || b.productionDate !== productionDate) {
        throw new ValidationError('Can only merge batches with the same recipe and production date');
      }
    }

    // Sum quantities
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const highestPriority = Math.max(...batches.map((b) => b.priority));
    const lowestStage = Math.min(...batches.map((b) => b.stage));

    // Create merged batch
    const merged = await ProductionCrud.create(storeId, {
      recipeId,
      recipeName: first.recipeName,
      quantity: totalQuantity,
      productionDate,
      priority: highestPriority,
      assignedTo: first.assignedTo,
      source: first.source,
      notes: batches.map((b) => b.notes).filter(Boolean).join('; ') || undefined,
    });

    // Set the merged batch to the lowest stage of the originals
    const finalBatch = lowestStage > 0
      ? await ProductionCrud.updateStage(storeId, merged.id, lowestStage as ProductionStage)
      : merged;

    // Move order sources to merged batch
    for (const b of batches) {
      const orderSources = await ProductionCrud.getBatchOrdersByBatchId(storeId, b.id);
      for (const src of orderSources) {
        await ProductionCrud.createBatchOrder(storeId, {
          batchId: merged.id,
          orderId: src.orderId,
          orderItemIndex: src.orderItemIndex,
          quantityFromOrder: src.quantityFromOrder,
        });
      }
    }

    // Create prep items for merged batch
    await this.createPrepItemsForBatch(storeId, finalBatch);

    // Delete original batches (cascade deletes batch_orders and batch_prep_items)
    for (const b of batches) {
      await ProductionCrud.delete(storeId, b.id);
    }

    return finalBatch;
  }

  async getPrepList(storeId: number, date: string) {
    return ProductionCrud.getAggregatedPrepList(storeId, date);
  }

  async togglePrepItem(storeId: number, id: number, isPrepped: boolean) {
    const existing = await ProductionCrud.getPrepItemById(storeId, id);
    if (!existing) throw new NotFoundError('Prep item not found');
    return ProductionCrud.togglePrepItem(storeId, id, isPrepped);
  }

  async getTimeline(storeId: number, date: string): Promise<ProductionBatch[]> {
    return ProductionCrud.getTimelineData(storeId, date);
  }

  private async createPrepItemsForBatch(storeId: number, batch: ProductionBatch): Promise<void> {
    if (!this.recipeService) return;

    try {
      const recipe = await this.recipeService.getById(storeId, batch.recipeId);
      if (!recipe.ingredients) return;

      for (const ing of recipe.ingredients) {
        const scaledQty = ing.quantity * batch.quantity;
        await ProductionCrud.createPrepItem(storeId, {
          batchId: batch.id,
          ingredientId: Number(ing.ingredientId),
          ingredientName: ing.name ?? 'Unknown',
          requiredQuantity: +scaledQty.toFixed(4),
          unit: ing.unit,
        });
      }
    } catch {
      // recipe not found, skip prep items
    }
  }
}
