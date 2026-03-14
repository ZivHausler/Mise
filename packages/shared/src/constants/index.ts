export { ErrorCode } from './errorCodes.js';
export type { ErrorCodeType } from './errorCodes.js';
export { STORE_CATEGORIES, STORE_CATEGORY_SUBJECT_KEYS, STORE_CATEGORY_MAP, ALL_SUB_SUBJECT_KEYS } from './storeCategories.js';
export type { StoreCategorySubject } from './storeCategories.js';

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

export const ORDER_STATUS = {
  PENDING_APPROVAL: 0,
  RECEIVED: 1,
  IN_PROGRESS: 2,
  READY: 3,
  DELIVERED: 4,
  CANCELLED: 5,
  CANCELLATION_REQUESTED: 6,
} as const;

export const ORDER_STATUSES = [
  'pending_approval', 'received', 'in_progress', 'ready', 'delivered',
  'cancelled', 'cancellation_requested',
] as const;
export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'] as const;
export const PAYMENT_METHODS = ['cash'] as const;
export const USER_ROLES = ['admin', 'staff', 'viewer'] as const;

export const MAX_RECURRING_OCCURRENCES = 52;

export const ORDER_STATUS_FLOW: Record<number, number[]> = {
  0: [1],    // pending_approval → received (approve)
  1: [2],    // received → in_progress
  2: [1, 3], // in_progress → received, ready
  3: [2, 4], // ready → in_progress, delivered
  4: [3],    // delivered → ready (correction only)
  5: [],     // cancelled → (terminal)
  6: [],     // cancellation_requested → (handled by dedicated endpoints)
};

/** Statuses from which a store owner can cancel */
export const OWNER_CANCELLABLE_STATUSES = [0, 1, 2, 3, 6] as const;

/** Statuses from which a customer can directly cancel (no request needed) */
export const CUSTOMER_DIRECT_CANCEL_STATUSES = [0] as const;

/** Statuses from which a customer can REQUEST cancellation */
export const CUSTOMER_REQUEST_CANCEL_STATUSES = [1, 2, 3] as const;
