export const PRODUCTION_STAGE = {
  TO_PREP: 0,
  MIXING: 1,
  PROOFING: 2,
  BAKING: 3,
  COOLING: 4,
  READY: 5,
  PACKAGED: 6,
} as const;

export type ProductionStage = (typeof PRODUCTION_STAGE)[keyof typeof PRODUCTION_STAGE];

export interface BatchRecipe {
  id: string;
  name: string;
}

export interface PrepItemIngredient {
  id: number;
  name: string;
}

export interface ProductionBatch {
  id: number;
  storeId: number;
  recipe: BatchRecipe;
  quantity: number;
  stage: ProductionStage;
  productionDate: string;
  priority: number;
  assignedTo?: string;
  source: 'auto' | 'manual';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  orderSources?: BatchOrder[];
  prepItems?: BatchPrepItem[];
}

export interface BatchOrder {
  id: number;
  batchId: number;
  orderId: number;
  orderItemIndex: number;
  quantityFromOrder: number;
}

export interface BatchPrepItem {
  id: number;
  batchId: number;
  ingredient: PrepItemIngredient;
  requiredQuantity: number;
  unit: string;
  isPrepped: boolean;
}

export interface AggregatedPrepItem {
  ingredient: PrepItemIngredient;
  totalRequired: number;
  unit: string;
  preppedCount: number;
  totalCount: number;
  currentStock?: number;
  items: (BatchPrepItem & { batchId: number; recipe: BatchRecipe })[];
}

export interface CreateBatchDTO {
  recipeId: string;
  recipeName?: string;
  quantity: number;
  productionDate: string;
  priority?: number;
  assignedTo?: string;
  notes?: string;
}

export interface UpdateBatchDTO {
  quantity?: number;
  priority?: number;
  assignedTo?: string | null;
  notes?: string | null;
}
