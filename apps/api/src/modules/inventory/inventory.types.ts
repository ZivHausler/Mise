export interface IngredientGroup {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  packageSize?: number;
  lowStockThreshold: number;
  supplier?: string;
  notes?: string;
  groups: IngredientGroup[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLog {
  id: string;
  ingredientId: string;
  type: 'addition' | 'usage' | 'adjustment';
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
  groupIds?: string[];
}

export interface UpdateIngredientDTO extends Partial<CreateIngredientDTO> {}

export interface AdjustStockDTO {
  ingredientId: string;
  type: 'addition' | 'usage' | 'adjustment';
  quantity: number;
  reason?: string;
  pricePaid?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
