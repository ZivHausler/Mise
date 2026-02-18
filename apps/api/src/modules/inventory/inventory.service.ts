import type { AdjustStockDTO, CreateIngredientDTO, Ingredient, InventoryLog, PaginatedResult, UpdateIngredientDTO } from './inventory.types.js';
import { InventoryCrud } from './inventoryCrud.js';
import { AdjustStockUseCase } from './use-cases/adjustStock.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export class InventoryService {
  constructor() {}

  async getById(storeId: string, id: string): Promise<Ingredient> {
    const ingredient = await InventoryCrud.getById(storeId, id);
    if (!ingredient) throw new NotFoundError('Ingredient not found');
    return ingredient;
  }

  async getAll(storeId: string, search?: string): Promise<Ingredient[]> {
    return InventoryCrud.getAll(storeId, search);
  }

  async getAllPaginated(storeId: string, page: number, limit: number, search?: string, groupIds?: string[], statuses?: string[]): Promise<PaginatedResult<Ingredient>> {
    return InventoryCrud.getAllPaginated(storeId, page, limit, search, groupIds, statuses);
  }

  async getLowStock(storeId: string): Promise<Ingredient[]> {
    return InventoryCrud.getLowStock(storeId);
  }

  async create(storeId: string, data: CreateIngredientDTO): Promise<Ingredient> {
    return InventoryCrud.create(storeId, data);
  }

  async update(storeId: string, id: string, data: UpdateIngredientDTO): Promise<Ingredient> {
    return InventoryCrud.update(storeId, id, data);
  }

  async adjustStock(storeId: string, data: AdjustStockDTO): Promise<Ingredient> {
    const adjustStockUseCase = new AdjustStockUseCase();
    return adjustStockUseCase.execute(storeId, data);
  }

  async getLog(storeId: string, ingredientId: string): Promise<InventoryLog[]> {
    return InventoryCrud.getLog(storeId, ingredientId);
  }

  async delete(storeId: string, id: string): Promise<void> {
    return InventoryCrud.delete(storeId, id);
  }
}
