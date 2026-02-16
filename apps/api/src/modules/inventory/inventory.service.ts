import type { IInventoryRepository } from './inventory.repository.js';
import type { EventBus } from '../../core/events/event-bus.js';
import type { AdjustStockDTO, CreateIngredientDTO, Ingredient, InventoryLog, PaginatedResult, UpdateIngredientDTO } from './inventory.types.js';
import { CreateIngredientUseCase } from './use-cases/createIngredient.js';
import { UpdateIngredientUseCase } from './use-cases/updateIngredient.js';
import { AdjustStockUseCase } from './use-cases/adjustStock.js';
import { DeleteIngredientUseCase } from './use-cases/deleteIngredient.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export class InventoryService {
  private createIngredientUseCase: CreateIngredientUseCase;
  private updateIngredientUseCase: UpdateIngredientUseCase;
  private adjustStockUseCase: AdjustStockUseCase;
  private deleteIngredientUseCase: DeleteIngredientUseCase;

  constructor(
    private inventoryRepository: IInventoryRepository,
    private eventBus: EventBus,
  ) {
    this.createIngredientUseCase = new CreateIngredientUseCase(inventoryRepository);
    this.updateIngredientUseCase = new UpdateIngredientUseCase(inventoryRepository);
    this.adjustStockUseCase = new AdjustStockUseCase(inventoryRepository);
    this.deleteIngredientUseCase = new DeleteIngredientUseCase(inventoryRepository);
  }

  async getById(id: string): Promise<Ingredient> {
    const ingredient = await this.inventoryRepository.findById(id);
    if (!ingredient) throw new NotFoundError('Ingredient not found');
    return ingredient;
  }

  async getAll(search?: string): Promise<Ingredient[]> {
    return this.inventoryRepository.findAll(search);
  }

  async getAllPaginated(page: number, limit: number, search?: string, groupIds?: string[]): Promise<PaginatedResult<Ingredient>> {
    return this.inventoryRepository.findAllPaginated(page, limit, search, groupIds);
  }

  async getLowStock(): Promise<Ingredient[]> {
    return this.inventoryRepository.findLowStock();
  }

  async create(data: CreateIngredientDTO): Promise<Ingredient> {
    return this.createIngredientUseCase.execute(data);
  }

  async update(id: string, data: UpdateIngredientDTO): Promise<Ingredient> {
    return this.updateIngredientUseCase.execute(id, data);
  }

  async adjustStock(data: AdjustStockDTO): Promise<Ingredient> {
    const ingredient = await this.adjustStockUseCase.execute(data);

    if (ingredient.quantity <= ingredient.lowStockThreshold) {
      await this.eventBus.publish({
        eventName: 'inventory.lowStock',
        payload: {
          ingredientId: ingredient.id,
          name: ingredient.name,
          currentQuantity: ingredient.quantity,
          threshold: ingredient.lowStockThreshold,
        },
        timestamp: new Date(),
      });
    }

    return ingredient;
  }

  async getLog(ingredientId: string): Promise<InventoryLog[]> {
    return this.inventoryRepository.getLog(ingredientId);
  }

  async delete(id: string): Promise<void> {
    return this.deleteIngredientUseCase.execute(id);
  }
}
