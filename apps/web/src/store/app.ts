import { create } from 'zustand';

type Language = 'he' | 'en';
export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy';

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
  language: (localStorage.getItem('i18nextLng') as Language) || 'he',
  dateFormat: (localStorage.getItem('dateFormat') as DateFormat) || 'dd/mm/yyyy',
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
