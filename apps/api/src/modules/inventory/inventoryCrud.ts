import { PgInventoryRepository } from './inventory.repository.js';
import type { AdjustStockDTO, CreateIngredientDTO, Ingredient, InventoryLog, UpdateIngredientDTO } from './inventory.types.js';
import type { PaginatedResult } from './inventory.types.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';

export class InventoryCrud {
  static async create(storeId: string, data: CreateIngredientDTO): Promise<Ingredient> {
    if (!data.name.trim()) {
      throw new ValidationError('Ingredient name is required');
    }
    if (data.quantity < 0) {
      throw new ValidationError('Quantity must be non-negative');
    }
    if (data.costPerUnit < 0) {
      throw new ValidationError('Cost per unit must be non-negative');
    }
    return PgInventoryRepository.create(storeId, data);
  }

  static async getById(storeId: string, id: string): Promise<Ingredient | null> {
    return PgInventoryRepository.findById(storeId, id);
  }

  static async getAll(storeId: string, search?: string): Promise<Ingredient[]> {
    return PgInventoryRepository.findAll(storeId, search);
  }

  static async getAllPaginated(storeId: string, page: number, limit: number, search?: string, groupIds?: string[], statuses?: string[]): Promise<PaginatedResult<Ingredient>> {
    return PgInventoryRepository.findAllPaginated(storeId, page, limit, search, groupIds, statuses);
  }

  static async getLowStock(storeId: string): Promise<Ingredient[]> {
    return PgInventoryRepository.findLowStock(storeId);
  }

  static async update(storeId: string, id: string, data: UpdateIngredientDTO): Promise<Ingredient> {
    const existing = await PgInventoryRepository.findById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Ingredient not found');
    }
    return PgInventoryRepository.update(storeId, id, data);
  }

  static async delete(storeId: string, id: string): Promise<void> {
    const existing = await PgInventoryRepository.findById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Ingredient not found');
    }
    return PgInventoryRepository.delete(storeId, id);
  }

  static async getLog(storeId: string, ingredientId: string): Promise<InventoryLog[]> {
    return PgInventoryRepository.getLog(storeId, ingredientId);
  }

  static async adjustStock(storeId: string, data: AdjustStockDTO): Promise<Ingredient> {
    return PgInventoryRepository.adjustStock(storeId, data);
  }
}
