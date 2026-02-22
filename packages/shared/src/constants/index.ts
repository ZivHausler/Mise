export enum Language {
  HEBREW = 0,
  ENGLISH = 1,
  ARABIC = 3,
}

export enum InventoryLogType {
  ADDITION = 0,
  USAGE = 1,
  ADJUSTMENT = 2,
}

export const INVENTORY_LOG_TYPE_DB: Record<InventoryLogType, string> = {
  [InventoryLogType.ADDITION]: 'addition',
  [InventoryLogType.USAGE]: 'usage',
  [InventoryLogType.ADJUSTMENT]: 'adjustment',
};

export const INVENTORY_LOG_TYPE_FROM_DB: Record<string, InventoryLogType> = {
  addition: InventoryLogType.ADDITION,
  usage: InventoryLogType.USAGE,
  adjustment: InventoryLogType.ADJUSTMENT,
};

export const ORDER_STATUSES = ['received', 'in_progress', 'ready', 'delivered'] as const;
export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'] as const;
export const PAYMENT_METHODS = ['cash', 'credit_card'] as const;
export const USER_ROLES = ['admin', 'staff', 'viewer'] as const;

export const MAX_RECURRING_OCCURRENCES = 52;

export const ORDER_STATUS_FLOW: Record<number, number[]> = {
  0: [1],    // received → in_progress
  1: [0, 2], // in_progress → received, ready
  2: [1, 3], // ready → in_progress, delivered
  3: [2],    // delivered → ready
};
