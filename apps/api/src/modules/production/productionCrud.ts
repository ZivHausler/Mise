import { PgProductionRepository } from './production.repository.js';
import type { ProductionBatch, BatchPrepItem, ProductionStage } from './production.types.js';

export class ProductionCrud {
  static async findByDate(storeId: number, date: string): Promise<ProductionBatch[]> {
    return PgProductionRepository.findByDate(storeId, date);
  }

  static async findById(storeId: number, id: number): Promise<ProductionBatch | null> {
    return PgProductionRepository.findById(storeId, id);
  }

  static async create(
    storeId: number,
    data: { recipeId: string; recipeName: string; quantity: number; productionDate: string; priority: number; assignedTo?: string; source: 'auto' | 'manual'; notes?: string },
  ): Promise<ProductionBatch> {
    return PgProductionRepository.create(storeId, data);
  }

  static async updateStage(storeId: number, id: number, stage: ProductionStage): Promise<ProductionBatch> {
    return PgProductionRepository.updateStage(storeId, id, stage);
  }

  static async update(storeId: number, id: number, data: Partial<{ quantity: number; priority: number; assignedTo: string | null; notes: string | null }>): Promise<ProductionBatch> {
    return PgProductionRepository.update(storeId, id, data);
  }

  static async delete(storeId: number, id: number): Promise<void> {
    return PgProductionRepository.delete(storeId, id);
  }

  static async createBatchOrder(storeId: number, data: { batchId: number; orderId: number; orderItemIndex: number; quantityFromOrder: number }): Promise<void> {
    return PgProductionRepository.createBatchOrder(storeId, data);
  }

  static async createPrepItem(storeId: number, data: { batchId: number; ingredientId: number; ingredientName: string; requiredQuantity: number; unit: string }): Promise<void> {
    return PgProductionRepository.createPrepItem(storeId, data);
  }

  static async togglePrepItem(storeId: number, id: number, isPrepped: boolean): Promise<BatchPrepItem> {
    return PgProductionRepository.togglePrepItem(storeId, id, isPrepped);
  }

  static async getPrepItemById(storeId: number, id: number): Promise<BatchPrepItem | null> {
    return PgProductionRepository.getPrepItemById(storeId, id);
  }

  static async getAggregatedPrepList(storeId: number, date: string) {
    return PgProductionRepository.getAggregatedPrepList(storeId, date);
  }

  static async getTimelineData(storeId: number, date: string): Promise<ProductionBatch[]> {
    return PgProductionRepository.getTimelineData(storeId, date);
  }

  static async deleteBatchOrdersByBatchId(storeId: number, batchId: number): Promise<void> {
    return PgProductionRepository.deleteBatchOrdersByBatchId(storeId, batchId);
  }

  static async deletePrepItemsByBatchId(storeId: number, batchId: number): Promise<void> {
    return PgProductionRepository.deletePrepItemsByBatchId(storeId, batchId);
  }

  static async getBatchOrdersByBatchId(storeId: number, batchId: number) {
    return PgProductionRepository.getBatchOrdersByBatchId(storeId, batchId);
  }
}
