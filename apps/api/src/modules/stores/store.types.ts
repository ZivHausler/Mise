export enum StoreRole {
  ADMIN = -1,
  OWNER = 1,
  MANAGER = 2,
  EMPLOYEE = 3,
}

export type AppTheme = 'cream' | 'white' | 'stone' | 'rose' | 'mint' | 'sky' | 'lavender';

export interface Store {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  theme: AppTheme;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStoreInfo {
  id: number;
  name: string;
  code: string | null;
  theme: AppTheme;
}

export interface UserStore {
  userId: number;
  storeId: number;
  role: StoreRole;
  store: UserStoreInfo;
}

export interface StoreInvitation {
  id: number;
  storeId: number | null;
  storeName?: string | null;
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
