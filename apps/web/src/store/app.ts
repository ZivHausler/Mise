import { create } from 'zustand';
import { DEFAULT_DATE_FORMAT, DEFAULT_LANGUAGE, DEFAULT_WEEK_START_DAY, DEFAULT_SHOW_FRIDAY, DEFAULT_SHOW_SATURDAY, ENUM_TO_LANGUAGE } from '@/constants/defaults';
import type { DateFormat, Language, WeekStartDay } from '@/constants/defaults';

export type { DateFormat, Language, WeekStartDay };

type OrdersViewMode = 'pipeline' | 'list' | 'calendar';
type RecipesViewMode = 'grid' | 'list';
type SettingsTab = 'account' | 'team' | 'units' | 'allergens' | 'tags' | 'notifications' | 'loyalty' | 'integrations' | 'billing';
type ProductionTab = 'board' | 'timeline' | 'prepList';
type AdminDashboardRange = 'week' | 'month' | 'year';

interface AppState {
  language: Language;
  dateFormat: DateFormat;
  weekStartDay: WeekStartDay;
  showFriday: boolean;
  showSaturday: boolean;
  sidebarCollapsed: boolean;
  adminDarkMode: boolean;
  ordersViewMode: OrdersViewMode;
  recipesViewMode: RecipesViewMode;
  productionTab: ProductionTab;
  settingsTab: SettingsTab;
  adminDashboardRange: AdminDashboardRange;
  setLanguage: (lang: Language) => void;
  setDateFormat: (format: DateFormat) => void;
  setWeekStartDay: (day: WeekStartDay) => void;
  setShowFriday: (show: boolean) => void;
  setShowSaturday: (show: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleAdminDarkMode: () => void;
  setOrdersViewMode: (mode: OrdersViewMode) => void;
  setRecipesViewMode: (mode: RecipesViewMode) => void;
  setProductionTab: (tab: ProductionTab) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  setAdminDashboardRange: (range: AdminDashboardRange) => void;
  initLanguageFromProfile: (langEnum: number) => void;
}

function boolFromStorage(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === 'true';
}

export const useAppStore = create<AppState>((set) => ({
  language: DEFAULT_LANGUAGE,
  dateFormat: (localStorage.getItem('dateFormat') as DateFormat) || DEFAULT_DATE_FORMAT,
  weekStartDay: (localStorage.getItem('weekStartDay') as WeekStartDay) || DEFAULT_WEEK_START_DAY,
  showFriday: boolFromStorage('showFriday', DEFAULT_SHOW_FRIDAY),
  showSaturday: boolFromStorage('showSaturday', DEFAULT_SHOW_SATURDAY),
  sidebarCollapsed: false,
  adminDarkMode: localStorage.getItem('adminDarkMode') === 'true',
  ordersViewMode: (localStorage.getItem('ordersViewMode') as OrdersViewMode) || 'calendar',
  recipesViewMode: (localStorage.getItem('recipesViewMode') as RecipesViewMode) || 'grid',
  productionTab: (localStorage.getItem('productionTab') as ProductionTab) || 'board',
  settingsTab: (localStorage.getItem('settingsTab') as SettingsTab) || 'account',
  adminDashboardRange: (localStorage.getItem('adminDashboardRange') as AdminDashboardRange) || 'month',
  setLanguage: (language) => {
    localStorage.setItem('i18nextLng', language);
    set({ language });
  },
  setDateFormat: (dateFormat) => {
    localStorage.setItem('dateFormat', dateFormat);
    set({ dateFormat });
  },
  setWeekStartDay: (weekStartDay) => {
    localStorage.setItem('weekStartDay', weekStartDay);
    set({ weekStartDay });
  },
  setShowFriday: (showFriday) => {
    localStorage.setItem('showFriday', String(showFriday));
    set({ showFriday });
  },
  setShowSaturday: (showSaturday) => {
    localStorage.setItem('showSaturday', String(showSaturday));
    set({ showSaturday });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleAdminDarkMode: () => set((s) => {
    const next = !s.adminDarkMode;
    localStorage.setItem('adminDarkMode', String(next));
    document.documentElement.classList.toggle('dark', next);
    return { adminDarkMode: next };
  }),
  setOrdersViewMode: (ordersViewMode) => {
    localStorage.setItem('ordersViewMode', ordersViewMode);
    set({ ordersViewMode });
  },
  setRecipesViewMode: (recipesViewMode) => {
    localStorage.setItem('recipesViewMode', recipesViewMode);
    set({ recipesViewMode });
  },
  setProductionTab: (productionTab) => {
    localStorage.setItem('productionTab', productionTab);
    set({ productionTab });
  },
  setSettingsTab: (settingsTab) => {
    localStorage.setItem('settingsTab', settingsTab);
    set({ settingsTab });
  },
  setAdminDashboardRange: (adminDashboardRange) => {
    localStorage.setItem('adminDashboardRange', adminDashboardRange);
    set({ adminDashboardRange });
  },
  initLanguageFromProfile: (langEnum) => {
    const language = ENUM_TO_LANGUAGE[langEnum] ?? DEFAULT_LANGUAGE;
    localStorage.setItem('i18nextLng', language);
    set({ language });
  },
}));
