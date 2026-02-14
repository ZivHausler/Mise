import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'viewer';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  setAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
