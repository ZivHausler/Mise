import type { Allergen, CreateAllergenDTO, UpdateAllergenDTO } from '../settings.types.js';
import { AllergensCrud } from './allergensCrud.js';
import { NotFoundError, ForbiddenError } from '../../../core/errors/app-error.js';

export class AllergensService {
  async listAllergens(storeId: number): Promise<Allergen[]> {
    return AllergensCrud.getAll(storeId);
  }

  async createAllergen(storeId: number, data: CreateAllergenDTO): Promise<Allergen> {
    return AllergensCrud.create(storeId, data);
  }

  async updateAllergen(allergenId: number, storeId: number, data: UpdateAllergenDTO): Promise<Allergen> {
    const allergen = await AllergensCrud.getById(allergenId, storeId);
    if (!allergen) throw new NotFoundError('Allergen not found');
    if (allergen.isDefault) throw new ForbiddenError('Default allergens cannot be modified');
    if (allergen.storeId !== storeId) throw new ForbiddenError('Not authorized to modify this allergen');
    return AllergensCrud.update(allergenId, storeId, data);
  }

  async deleteAllergen(allergenId: number, storeId: number): Promise<void> {
    const allergen = await AllergensCrud.getById(allergenId, storeId);
    if (!allergen) throw new NotFoundError('Allergen not found');
    if (allergen.isDefault) throw new ForbiddenError('Default allergens cannot be deleted');
    if (allergen.storeId !== storeId) throw new ForbiddenError('Not authorized to delete this allergen');
    return AllergensCrud.delete(allergenId, storeId);
  }
}
