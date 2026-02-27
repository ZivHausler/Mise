export const ORDER_STATUS = {
  RECEIVED: 0,
  IN_PROGRESS: 1,
  READY: 2,
  DELIVERED: 3,
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];


export interface OrderCustomer {
  id: number | null;
  name: string | null;
}

export interface Order {
  id: number;
  orderNumber: number;
  customer: OrderCustomer;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  notes?: string;
  dueDate?: Date;
  recurringGroupId?: number;
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
  customerId: number;
  items: Omit<OrderItem, 'unitPrice'>[];
  notes?: string;
  dueDate?: Date;
}

export interface UpdateOrderDTO {
  notes?: string;
  dueDate?: Date;
  items?: {
    recipeId: string;
    recipeName?: string;
    quantity: number;
    price?: number;
    notes?: string;
  }[];
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
}
