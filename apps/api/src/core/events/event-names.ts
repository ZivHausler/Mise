export const EventNames = {
  ORDER_CREATED: 'order.created',
  INVENTORY_LOW_STOCK: 'inventory.lowStock',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_REFUNDED: 'payment.refunded',
  RECIPE_UPDATED: 'recipe.updated',
  BATCH_CREATED: 'batch.created',
  BATCH_STAGE_CHANGED: 'batch.stageChanged',
  BATCH_COMPLETED: 'batch.completed',
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
