export const USER_ROLE = {
  ADMIN: 'admin',
  STAFF: 'staff',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
  role: UserRole;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
}
