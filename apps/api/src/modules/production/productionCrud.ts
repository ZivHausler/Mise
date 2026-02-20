import { PgProductionRepository } from './production.repository.js';
import type { ProductionBatch, BatchPrepItem, ProductionStage } from './production.types.js';

export class ProductionCrud {
  static async findByDate(storeId: string, date: string): Promise<ProductionBatch[]> {
    return PgProductionRepository.findByDate(storeId, date);
  }

  static async findById(storeId: string, id: string): Promise<ProductionBatch | null> {
    return PgProductionRepository.findById(storeId, id);
  }

  static async create(
    storeId: string,
    data: { recipeId: string; recipeName: string; quantity: number; productionDate: string; priority: number; assignedTo?: string; source: 'auto' | 'manual'; notes?: string },
  ): Promise<ProductionBatch> {
    return PgProductionRepository.create(storeId, data);
  }

  static async updateStage(storeId: string, id: string, stage: ProductionStage): Promise<ProductionBatch> {
    return PgProductionRepository.updateStage(storeId, id, stage);
  }

  static async update(storeId: string, id: string, data: Partial<{ quantity: number; priority: number; assignedTo: string | null; notes: string | null }>): Promise<ProductionBatch> {
    return PgProductionRepository.update(storeId, id, data);
  }

  static async delete(storeId: string, id: string): Promise<void> {
    return PgProductionRepository.delete(storeId, id);
  }

  static async createBatchOrder(storeId: string, data: { batchId: string; orderId: string; orderItemIndex: number; quantityFromOrder: number }): Promise<void> {
    return PgProductionRepository.createBatchOrder(storeId, data);
  }

  static async createPrepItem(storeId: string, data: { batchId: string; ingredientId: string; ingredientName: string; requiredQuantity: number; unit: string }): Promise<void> {
    return PgProductionRepository.createPrepItem(storeId, data);
  }

  static async togglePrepItem(storeId: string, id: string, isPrepped: boolean): Promise<BatchPrepItem> {
    return PgProductionRepository.togglePrepItem(storeId, id, isPrepped);
  }

  static async getPrepItemById(storeId: string, id: string): Promise<BatchPrepItem | null> {
    return PgProductionRepository.getPrepItemById(storeId, id);
  }

  static async getAggregatedPrepList(storeId: string, date: string) {
    return PgProductionRepository.getAggregatedPrepList(storeId, date);
  }

  static async getTimelineData(storeId: string, date: string): Promise<ProductionBatch[]> {
    return PgProductionRepository.getTimelineData(storeId, date);
  }

  static async deleteBatchOrdersByBatchId(storeId: string, batchId: string): Promise<void> {
    return PgProductionRepository.deleteBatchOrdersByBatchId(storeId, batchId);
  }

  static async deletePrepItemsByBatchId(storeId: string, batchId: string): Promise<void> {
    return PgProductionRepository.deletePrepItemsByBatchId(storeId, batchId);
  }

  static async getBatchOrdersByBatchId(storeId: string, batchId: string) {
    return PgProductionRepository.getBatchOrdersByBatchId(storeId, batchId);
  }
}
