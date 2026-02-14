import { create } from 'zustand';

type Language = 'he' | 'en';

interface AppState {
  language: Language;
  sidebarCollapsed: boolean;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: (localStorage.getItem('i18nextLng') as Language) || 'he',
  sidebarCollapsed: false,
  setLanguage: (language) => {
    localStorage.setItem('i18nextLng', language);
    set({ language });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
