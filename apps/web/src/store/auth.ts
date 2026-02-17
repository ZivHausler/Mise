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
  stores: StoreInfo[];
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, hasStore?: boolean) => void;
  setStores: (stores: StoreInfo[]) => void;
  setHasStore: (hasStore: boolean) => void;
  updateToken: (token: string) => void;
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
  stores: getStoredStores(),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  setAuth: (user, token, hasStore) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (hasStore !== undefined) {
      localStorage.setItem('auth_has_store', String(hasStore));
    }
    set({ user, token, isAuthenticated: true, hasStore: hasStore ?? getStoredHasStore() });
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
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_has_store');
    localStorage.removeItem('auth_stores');
    set({ user: null, token: null, isAuthenticated: false, hasStore: false, stores: [] });
  },
}));
