export const ORDER_STATUSES = ['received', 'in_progress', 'ready', 'delivered'] as const;
export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'] as const;
export const PAYMENT_METHODS = ['cash', 'credit_card'] as const;
export const USER_ROLES = ['admin', 'staff', 'viewer'] as const;

export const ORDER_STATUS_FLOW: Record<number, number[]> = {
  0: [1],    // received → in_progress
  1: [0, 2], // in_progress → received, ready
  2: [1, 3], // ready → in_progress, delivered
  3: [2],    // delivered → ready
};
