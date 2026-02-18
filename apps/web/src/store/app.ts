import { create } from 'zustand';
import { DEFAULT_DATE_FORMAT, DEFAULT_LANGUAGE } from '@/constants/defaults';
import type { DateFormat, Language } from '@/constants/defaults';

export type { DateFormat, Language };

interface AppState {
  language: Language;
  dateFormat: DateFormat;
  sidebarCollapsed: boolean;
  setLanguage: (lang: Language) => void;
  setDateFormat: (format: DateFormat) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: (localStorage.getItem('i18nextLng') as Language) || DEFAULT_LANGUAGE,
  dateFormat: (localStorage.getItem('dateFormat') as DateFormat) || DEFAULT_DATE_FORMAT,
  sidebarCollapsed: false,
  setLanguage: (language) => {
    localStorage.setItem('i18nextLng', language);
    set({ language });
  },
  setDateFormat: (dateFormat) => {
    localStorage.setItem('dateFormat', dateFormat);
    set({ dateFormat });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
