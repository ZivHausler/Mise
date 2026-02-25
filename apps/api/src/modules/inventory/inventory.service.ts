import type { AdjustStockDTO, CreateIngredientDTO, Ingredient, InventoryLog, UpdateIngredientDTO } from './inventory.types.js';
import type { PaginatedResult } from '../../core/types/pagination.js';
import { InventoryCrud } from './inventoryCrud.js';
import { AdjustStockUseCase } from './use-cases/adjustStock.js';
import { RecipeCrud } from '../recipes/recipeCrud.js';
import { ConflictError, NotFoundError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class InventoryService {
  constructor() {}

  async getById(storeId: number, id: number): Promise<Ingredient> {
    const ingredient = await InventoryCrud.getById(storeId, id);
    if (!ingredient) throw new NotFoundError('Ingredient not found', ErrorCode.INGREDIENT_NOT_FOUND);
    return ingredient;
  }

  async getAll(storeId: number, search?: string): Promise<Ingredient[]> {
    return InventoryCrud.getAll(storeId, search);
  }

  async getAllPaginated(storeId: number, page: number, limit: number, search?: string, groupIds?: number[], statuses?: string[]): Promise<PaginatedResult<Ingredient>> {
    return InventoryCrud.getAllPaginated(storeId, page, limit, search, groupIds, statuses);
  }

  async getLowStock(storeId: number): Promise<Ingredient[]> {
    return InventoryCrud.getLowStock(storeId);
  }

  async create(storeId: number, data: CreateIngredientDTO): Promise<Ingredient> {
    return InventoryCrud.create(storeId, data);
  }

  async update(storeId: number, id: number, data: UpdateIngredientDTO): Promise<Ingredient> {
    const existing = await InventoryCrud.getById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Ingredient not found', ErrorCode.INGREDIENT_NOT_FOUND);
    }
    return InventoryCrud.update(storeId, id, data);
  }

  async adjustStock(storeId: number, data: AdjustStockDTO, correlationId?: string, options?: { suppressEvent?: boolean }): Promise<Ingredient> {
    const adjustStockUseCase = new AdjustStockUseCase();
    return adjustStockUseCase.execute(storeId, data, correlationId, options);
  }

  async getLog(storeId: number, ingredientId: number): Promise<InventoryLog[]> {
    return InventoryCrud.getLog(storeId, ingredientId);
  }

  async delete(storeId: number, id: number): Promise<void> {
    const existing = await InventoryCrud.getById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Ingredient not found', ErrorCode.INGREDIENT_NOT_FOUND);
    }
    const recipeCount = await RecipeCrud.countByIngredient(storeId, id);
    if (recipeCount > 0) {
      throw new ConflictError('Ingredient is used in recipes', ErrorCode.INGREDIENT_IN_USE_BY_RECIPES);
    }
    return InventoryCrud.delete(storeId, id);
  }
}
