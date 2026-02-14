export const ORDER_STATUSES = ['received', 'in_progress', 'ready', 'delivered'] as const;
export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'] as const;
export const PAYMENT_METHODS = ['cash', 'credit_card'] as const;
export const USER_ROLES = ['admin', 'staff', 'viewer'] as const;

export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  received: ['in_progress'],
  in_progress: ['ready'],
  ready: ['delivered'],
  delivered: [],
};
