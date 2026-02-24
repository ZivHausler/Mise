import { InventoryLogType } from '@mise/shared';

export { InventoryLogType };

export interface IngredientAllergen {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  packageSize?: number;
  lowStockThreshold: number;
  supplier?: string;
  notes?: string;
  allergens: IngredientAllergen[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLog {
  id: number;
  ingredientId: number;
  type: InventoryLogType;
  quantity: number;
  reason?: string;
  pricePaid?: number;
  createdAt: Date;
}

export interface CreateIngredientDTO {
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  packageSize?: number;
  lowStockThreshold: number;
  supplier?: string;
  notes?: string;
  allergenIds?: number[];
}

export interface UpdateIngredientDTO extends Partial<CreateIngredientDTO> {}

export interface AdjustStockDTO {
  ingredientId: number;
  type: InventoryLogType;
  quantity: number;
  reason?: string;
  pricePaid?: number;
}
