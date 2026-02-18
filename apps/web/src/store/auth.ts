import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface StoreInfo {
  storeId: string;
  storeName: string;
  role: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hasStore: boolean;
  isAdmin: boolean;
  stores: StoreInfo[];
  isAuthenticated: boolean;
  pendingCreateStoreToken: string | null;
  setAuth: (user: User, token: string, hasStore?: boolean, isAdmin?: boolean) => void;
  setStores: (stores: StoreInfo[]) => void;
  setHasStore: (hasStore: boolean) => void;
  updateToken: (token: string) => void;
  setPendingCreateStoreToken: (token: string | null) => void;
  logout: () => void;
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredHasStore(): boolean {
  return localStorage.getItem('auth_has_store') === 'true';
}

function getStoredIsAdmin(): boolean {
  return localStorage.getItem('auth_is_admin') === 'true';
}

function getStoredStores(): StoreInfo[] {
  try {
    const raw = localStorage.getItem('auth_stores');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: localStorage.getItem('auth_token'),
  hasStore: getStoredHasStore(),
  isAdmin: getStoredIsAdmin(),
  stores: getStoredStores(),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  pendingCreateStoreToken: localStorage.getItem('pending_create_store_token'),
  setAuth: (user, token, hasStore, isAdmin) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (hasStore !== undefined) {
      localStorage.setItem('auth_has_store', String(hasStore));
    }
    if (isAdmin !== undefined) {
      localStorage.setItem('auth_is_admin', String(isAdmin));
    }
    set({ user, token, isAuthenticated: true, hasStore: hasStore ?? getStoredHasStore(), isAdmin: isAdmin ?? getStoredIsAdmin() });
  },
  setStores: (stores) => {
    localStorage.setItem('auth_stores', JSON.stringify(stores));
    set({ stores });
  },
  setHasStore: (hasStore) => {
    localStorage.setItem('auth_has_store', String(hasStore));
    set({ hasStore });
  },
  updateToken: (token) => {
    localStorage.setItem('auth_token', token);
    set({ token });
  },
  setPendingCreateStoreToken: (token) => {
    if (token) {
      localStorage.setItem('pending_create_store_token', token);
    } else {
      localStorage.removeItem('pending_create_store_token');
    }
    set({ pendingCreateStoreToken: token });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_has_store');
    localStorage.removeItem('auth_is_admin');
    localStorage.removeItem('auth_stores');
    localStorage.removeItem('pending_create_store_token');
    set({ user: null, token: null, isAuthenticated: false, hasStore: false, isAdmin: false, stores: [], pendingCreateStoreToken: null });
  },
}));
