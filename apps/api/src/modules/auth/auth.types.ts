export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  googleId?: string;
  name: string;
  phone?: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isAdmin: boolean;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  storeId?: string;
  storeRole?: number;
  isAdmin?: boolean;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
  hasStore: boolean;
  stores: { storeId: string; storeName: string; role: number }[];
  pendingCreateStoreToken?: string;
}
