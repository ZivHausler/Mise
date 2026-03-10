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

// Receipt Scanner types

export interface ExtractedItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
}

export interface ExtractedReceipt {
  items: ExtractedItem[];
  vendor: string | null;
  date: string | null;
  total: number | null;
}

export interface MatchedItem extends ExtractedItem {
  unitPrice: number;
  match: {
    type: 'exact' | 'fuzzy' | 'none';
    ingredientId: number | null;
    ingredientName: string | null;
    confidence: number;
  };
}

export interface ScanResult {
  items: MatchedItem[];
  receiptMeta: {
    vendor: string | null;
    date: string | null;
    total: number | null;
  };
}

// Bulk operations types

export interface BulkAdjustmentDTO {
  ingredientId: number;
  quantity: number;
  pricePaid: number;
  reason?: string;
}

export interface BulkAdjustResultItem {
  ingredientId: number;
  name?: string;
  previousQuantity?: number;
  newQuantity?: number;
  success: boolean;
  error?: string;
}

export interface BulkAdjustResult {
  results: BulkAdjustResultItem[];
  summary: { total: number; succeeded: number; failed: number };
}
