export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  preferences?: CustomerPreferences;
  loyaltyEnabled: boolean;
  loyaltyTier: LoyaltyTier;
  orderCount?: number;
  totalSpent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPreferences {
  allergies?: string[];
  favorites?: string[];
}

export interface CreateCustomerDTO {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  preferences?: CustomerPreferences;
  loyaltyEnabled?: boolean;
  loyaltyTier?: LoyaltyTier;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {}
