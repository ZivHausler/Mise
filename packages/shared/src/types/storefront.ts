// Public API response types — shared between backend and mobile app

export interface PublicStoreInfo {
  name: string;
  nameEn?: string | null;
  slug: string;
  theme: string;
  address: string | null;
  phone: string | null;
  description?: string | null;
  descriptionEn?: string | null;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  sellingPrice: number;
  photos: string[];
  tags: string[];
}

export interface PublicMenuItemDetail extends PublicMenuItem {
  ingredients: { name: string }[];
}

export interface PublicOrderConfirmation {
  orderNumber: number;
  status: number;
  totalAmount: number;
  items: { name: string; quantity: number; unitPrice: number }[];
  dueDate: string | null;
  paymentStatus: 'unpaid' | 'paid';
  paypalOrderId?: string;
  approvalUrl?: string;
}

export interface PublicOrderStatus {
  orderNumber: number;
  status: number;
  previousStatus?: number;
  cancellationReason?: string;
  items: { recipeId?: string; name: string; quantity: number; unitPrice: number; photo?: string | null }[];
  totalAmount: number;
  dueDate: string | null;
  createdAt: string;
  unreadNotifications: number;
}

export interface PublicOrderNotification {
  id: number;
  statusFrom: number | null;
  statusTo: number;
  message: string;
  createdAt: string;
}

export type StorefrontPaymentMethod = 'pay_at_pickup' | 'paypal';
