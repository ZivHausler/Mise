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

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
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
