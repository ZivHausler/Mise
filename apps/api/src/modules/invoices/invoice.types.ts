export type InvoiceType = 'invoice' | 'credit_note';

export interface InvoiceItem {
  recipeId: string;
  recipeName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
}

export interface InvoiceCustomer {
  id: number | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface InvoiceStore {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
}

export interface InvoicePricing {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: number;
  storeId: number;
  orderId: number;
  orderNumber: string | null;
  type: InvoiceType;
  invoiceNumber: number;
  displayNumber: string;
  originalInvoiceId: number | null;

  // Customer snapshot
  customer: InvoiceCustomer;

  // Store snapshot
  store: InvoiceStore;

  // Financial
  pricing: InvoicePricing;

  // Items
  items: InvoiceItem[];

  // Metadata
  notes: string | null;
  allocationNumber: string | null;
  issuedBy: number | null;
  issuedAt: Date;
  createdAt: Date;
}

export interface CreateInvoiceDTO {
  orderId: number;
  notes?: string;
}

export interface CreateCreditNoteDTO {
  notes?: string;
}

export interface InvoiceFilters {
  type?: InvoiceType;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
