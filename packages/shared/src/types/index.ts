// Shared types used by both frontend and backend

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type OrderStatus = 'received' | 'in_progress' | 'ready' | 'delivered';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'credit_card';
export type UserRole = 'admin' | 'staff' | 'viewer';
