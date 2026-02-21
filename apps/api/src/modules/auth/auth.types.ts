export interface User {
  id: number;
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
  id: number;
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
  userId: number;
  email: string;
  storeId?: number;
  storeRole?: number;
  isAdmin?: boolean;
  jti?: string;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
  hasStore: boolean;
  stores: { storeId: number; storeName: string; role: number }[];
  pendingCreateStoreToken?: string;
}
