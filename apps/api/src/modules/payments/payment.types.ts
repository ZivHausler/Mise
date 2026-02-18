export const PAYMENT_METHOD = {
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_RECORD_STATUS = {
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
} as const;

export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUS)[keyof typeof PAYMENT_RECORD_STATUS];

export interface Payment {
  id: string;
  orderId: string;
  orderNumber?: number;
  customerName?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  notes?: string;
  createdAt: Date;
}

export interface CreatePaymentDTO {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}

export interface OrderPaymentSummary {
  orderId: string;
  totalAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  payments: Payment[];
}
