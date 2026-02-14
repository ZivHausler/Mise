export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  lowStockThreshold: number;
  supplier?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLog {
  id: string;
  ingredientId: string;
  type: 'addition' | 'usage' | 'adjustment';
  quantity: number;
  reason?: string;
  createdAt: Date;
}

export interface CreateIngredientDTO {
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  lowStockThreshold: number;
  supplier?: string;
  notes?: string;
}

export interface UpdateIngredientDTO extends Partial<CreateIngredientDTO> {}

export interface AdjustStockDTO {
  ingredientId: string;
  type: 'addition' | 'usage' | 'adjustment';
  quantity: number;
  reason?: string;
}
