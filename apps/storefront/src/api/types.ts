/**
 * Public API response types for the storefront.
 */

export interface DiscoveredStore {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  theme: string;
  categorySubject: string | null;
  categorySubSubject: string | null;
}

export interface PublicStoreInfo {
  name: string;
  slug: string;
  theme: string;
  applyThemeToApp: boolean;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  categorySubject: string | null;
}

export interface PublicAllergen {
  name: string;
  icon: string | null;
  color: string | null;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description?: string;
  sellingPrice: number;
  photos: string[];
  tags: string[];
  allergens: PublicAllergen[];
}

export interface PublicMenuItemDetail extends PublicMenuItem {
  ingredients: { name: string }[];
}

export interface CreateOrderInput {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: {
    recipeId: string;
    quantity: number;
    notes?: string;
  }[];
  notes?: string;
  dueDate?: string;
  paymentMethod: 'pay_at_pickup' | 'paypal';
  /** Required for PayPal: the pre-approved PayPal order ID */
  paypalOrderId?: string;
}

export interface PublicOrderConfirmation {
  orderNumber: number;
  status: number;
  totalAmount: number;
  items: { name: string; quantity: number; unitPrice: number }[];
  dueDate: string | null;
  paymentStatus: 'unpaid' | 'paid';
}

export interface PayPalOrderResponse {
  paypalOrderId: string;
  approvalUrl: string;
  totalAmount: number;
}

export interface PublicOrderStatus {
  orderNumber: number;
  status: number;
  items: { recipeId?: string; name: string; quantity: number; unitPrice: number; photo?: string | null }[];
  totalAmount: number;
  dueDate: string | null;
  createdAt: string;
}

export interface PayPalCaptureResponse {
  status: string;
  transactionId: string;
}

/**
 * Combined order summary for the Orders tab.
 * Merges local journal data with fetched server status.
 */
export interface CustomerOrderSummary {
  slug: string;
  storeName: string;
  orderNumber: number;
  phone: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  /** Status from server — undefined if fetch failed */
  status?: number;
  /** Items from server — undefined if fetch failed */
  items?: { recipeId?: string; name: string; quantity: number; unitPrice: number; photo?: string | null }[];
  /** Whether the server fetch succeeded */
  fetched: boolean;
}
