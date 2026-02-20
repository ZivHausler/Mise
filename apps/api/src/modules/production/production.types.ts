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

export interface ProductionBatch {
  id: string;
  storeId: string;
  recipeId: string;
  recipeName: string;
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
  id: string;
  batchId: string;
  orderId: string;
  orderItemIndex: number;
  quantityFromOrder: number;
}

export interface BatchPrepItem {
  id: string;
  batchId: string;
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  unit: string;
  isPrepped: boolean;
}

export interface AggregatedPrepItem {
  ingredientId: string;
  ingredientName: string;
  totalRequired: number;
  unit: string;
  preppedCount: number;
  totalCount: number;
  currentStock?: number;
  items: (BatchPrepItem & { batchId: string; recipeName: string })[];
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
