export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  disabledAt: Date | null;
  createdAt: Date;
  storeCount: number;
}

export interface AdminStore {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  createdAt: Date;
  memberCount: number;
}

export interface AdminStoreMember {
  userId: string;
  email: string;
  name: string;
  role: number;
  joinedAt: Date;
}

export interface AdminInvitation {
  id: string;
  email: string;
  storeId: string | null;
  storeName: string | null;
  role: number;
  token: string;
  status: 'pending' | 'used' | 'expired' | 'revoked';
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface AdminAuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  storeId: string | null;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  createdAt: string;
}

export interface SignupDataPoint {
  date: string;
  count: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalStores: number;
  activeInvitations: number;
  signupsPerDay: SignupDataPoint[];
}

