import { PgInventoryRepository } from './inventory.repository.js';
import type { AdjustStockDTO, CreateIngredientDTO, Ingredient, InventoryLog, UpdateIngredientDTO } from './inventory.types.js';
import type { PaginatedResult } from '../../core/types/pagination.js';

export class InventoryCrud {
  static async create(storeId: number, data: CreateIngredientDTO): Promise<Ingredient> {
    return PgInventoryRepository.create(storeId, data);
  }

  static async getById(storeId: number, id: number): Promise<Ingredient | null> {
    return PgInventoryRepository.findById(storeId, id);
  }

  static async getAll(storeId: number, search?: string): Promise<Ingredient[]> {
    return PgInventoryRepository.findAll(storeId, search);
  }

  static async getAllPaginated(storeId: number, page: number, limit: number, search?: string, allergenIds?: number[], statuses?: string[]): Promise<PaginatedResult<Ingredient>> {
    return PgInventoryRepository.findAllPaginated(storeId, page, limit, search, allergenIds, statuses);
  }

  static async getLowStock(storeId: number): Promise<Ingredient[]> {
    return PgInventoryRepository.findLowStock(storeId);
  }

  static async update(storeId: number, id: number, data: UpdateIngredientDTO): Promise<Ingredient> {
    return PgInventoryRepository.update(storeId, id, data);
  }

  static async delete(storeId: number, id: number): Promise<void> {
    return PgInventoryRepository.delete(storeId, id);
  }

  static async getLog(storeId: number, ingredientId: number): Promise<InventoryLog[]> {
    return PgInventoryRepository.getLog(storeId, ingredientId);
  }

  static async adjustStock(storeId: number, data: AdjustStockDTO): Promise<Ingredient> {
    return PgInventoryRepository.adjustStock(storeId, data);
  }
}
