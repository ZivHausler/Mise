import { PgAllergensRepository } from './allergens.repository.js';
import type { CreateAllergenDTO, Allergen, UpdateAllergenDTO } from '../settings.types.js';

export class AllergensCrud {
  static async create(storeId: number, data: CreateAllergenDTO): Promise<Allergen> {
    return PgAllergensRepository.create(storeId, data);
  }

  static async getById(id: number, storeId: number): Promise<Allergen | null> {
    return PgAllergensRepository.findById(id, storeId);
  }

  static async getAll(storeId: number): Promise<Allergen[]> {
    return PgAllergensRepository.findAll(storeId);
  }

  static async update(allergenId: number, storeId: number, data: UpdateAllergenDTO): Promise<Allergen> {
    return PgAllergensRepository.update(allergenId, storeId, data);
  }

  static async delete(allergenId: number, storeId: number): Promise<void> {
    await PgAllergensRepository.delete(allergenId, storeId);
  }
}
