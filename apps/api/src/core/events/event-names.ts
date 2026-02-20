export const EventNames = {
  ORDER_CREATED: 'order.created',
  INVENTORY_LOW_STOCK: 'inventory.lowStock',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_REFUNDED: 'payment.refunded',
  RECIPE_UPDATED: 'recipe.updated',
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
