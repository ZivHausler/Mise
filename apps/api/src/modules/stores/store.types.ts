export enum StoreRole {
  OWNER = 1,
  MANAGER = 2,
  EMPLOYEE = 3,
}

export interface Store {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStore {
  userId: string;
  storeId: string;
  role: StoreRole;
  storeName: string;
  storeCode: string | null;
}

export interface StoreInvitation {
  id: string;
  storeId: string;
  storeName?: string;
  email: string;
  role: StoreRole;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreateStoreDTO {
  name: string;
  code?: string;
  address?: string;
}
