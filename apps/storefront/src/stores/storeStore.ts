/**
 * Store info Zustand store.
 * Holds the current store's public info, set from the API response.
 */

import { create } from 'zustand';
import type { PublicStoreInfo } from '../api/types';
import type { ThemeName } from '../theme/palettes';

// 'default' = white bg, dark text | 'dark' = dark bg, light text | 'transparent' = no bg, light text
type StatusBarMode = 'default' | 'dark' | 'transparent';

interface StoreState {
  slug: string;
  storeInfo: PublicStoreInfo | null;
  isLoading: boolean;
  error: string | null;
  statusBarMode: StatusBarMode;

  // Actions
  setSlug: (slug: string) => void;
  setStoreInfo: (info: PublicStoreInfo) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStatusBarMode: (mode: StatusBarMode) => void;

  // Derived
  getThemeName: () => ThemeName;
}

export const useStoreStore = create<StoreState>()((set, get) => ({
  slug: '',
  storeInfo: null,
  isLoading: true,
  error: null,
  statusBarMode: 'default' as StatusBarMode,

  setSlug: (slug) => set({ slug }),
  setStatusBarMode: (mode) => set({ statusBarMode: mode }),

  setStoreInfo: (info) => set({ storeInfo: info, isLoading: false, error: null }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  getThemeName: () => {
    const theme = get().storeInfo?.theme;
    const validThemes: ThemeName[] = ['cream', 'white', 'stone', 'rose', 'mint', 'sky', 'lavender'];
    if (theme && validThemes.includes(theme as ThemeName)) {
      return theme as ThemeName;
    }
    return 'cream';
  },
}));
