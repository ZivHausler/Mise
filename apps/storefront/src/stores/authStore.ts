/**
 * Auth store — lightweight customer authentication state.
 * Persisted to AsyncStorage so the user stays logged in.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string;
  photo?: string;
  provider: 'google' | 'guest';
  isProfileComplete: boolean;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: UserProfile) => void;
  loginWithGoogle: (user: UserProfile, token: string) => void;
  loginAsGuest: () => void;
  updateProfile: (data: { firstName: string; lastName: string; phone: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      loginWithGoogle: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      loginAsGuest: () =>
        set({
          user: {
            id: `guest_${Date.now()}`,
            firstName: null,
            lastName: null,
            phone: null,
            email: '',
            provider: 'guest',
            isProfileComplete: true,
          },
          token: null,
          isAuthenticated: true,
        }),

      updateProfile: (data) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                isProfileComplete: true,
              }
            : null,
        })),

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
