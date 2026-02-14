export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  preferences?: CustomerPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPreferences {
  allergies?: string[];
  favorites?: string[];
}

export interface CreateCustomerDTO {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  preferences?: CustomerPreferences;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {}
