export const ORDER_STATUS = {
  RECEIVED: 0,
  IN_PROGRESS: 1,
  READY: 2,
  DELIVERED: 3,
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];


export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  notes?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  recipeId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateOrderDTO {
  customerId: string;
  items: Omit<OrderItem, 'unitPrice'>[];
  notes?: string;
  dueDate?: Date;
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
}
