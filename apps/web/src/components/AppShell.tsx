import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Shield, LayoutDashboard, ClipboardList, BookOpen, Package, Users, CreditCard, FileText, Settings } from 'lucide-react';
import { useOrderSSE } from '@/api/useOrderSSE';
import { Logo } from './Logo';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomTabs } from './BottomTabs';
import { NavigationProgress, PageSkeleton } from './Feedback';
import { TourProvider } from './tour/TourProvider';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { useSelectStore, useAllStores, useProfile } from '@/api/hooks';
import { ENUM_TO_LANGUAGE, DEFAULT_THEME, applyThemePalette } from '@/constants/defaults';
import type { AppTheme } from '@/constants/defaults';
import { languageDir } from '@/utils/language';

export const AppShell = React.memo(function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  useOrderSSE();

  // Sync language from user profile (DB is source of truth)
  const { i18n } = useTranslation();
  const { data: profile } = useProfile();
  const initLanguageFromProfile = useAppStore((s) => s.initLanguageFromProfile);
  React.useEffect(() => {
    const p = profile as { language?: number } | undefined;
    if (p && p.language !== undefined) {
      const lang = ENUM_TO_LANGUAGE[p.language] ?? 'he';
      if (lang !== i18n.language) {
        initLanguageFromProfile(p.language);
        i18n.changeLanguage(lang);
        document.documentElement.dir = languageDir(lang);
        document.documentElement.lang = lang;
      }
    }
  }, [profile, i18n, initLanguageFromProfile]);

  // Apply store theme palette
  const stores = useAuthStore((s) => s.stores);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  React.useEffect(() => {
    const activeStore = stores.find((s) => String(s.storeId) === String(activeStoreId));
    const theme = (activeStore?.store?.theme as AppTheme) || DEFAULT_THEME;
    applyThemePalette(theme);
  }, [stores, activeStoreId]);

  const handleMenuClick = useCallback(() => setDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <TourProvider>
      <div className="flex h-[100dvh] overflow-hidden">
        <NavigationProgress />
        <Sidebar />

        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <div className="fixed inset-0 z-drawer lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={handleCloseDrawer} />
            <aside className="fixed inset-y-0 start-0 z-10 w-[260px] bg-primary-900 animate-slide-in">
              <MobileNav onClose={handleCloseDrawer} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenuClick={handleMenuClick} />
          <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
          <BottomTabs />
        </div>

      </div>
    </TourProvider>
  );
});

// Simple mobile nav reusing the same items as sidebar
const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/orders', icon: ClipboardList, labelKey: 'nav.orders' },
  { path: '/recipes', icon: BookOpen, labelKey: 'nav.recipes' },
  { path: '/inventory', icon: Package, labelKey: 'nav.inventory' },
  { path: '/customers', icon: Users, labelKey: 'nav.customers' },
  { path: '/payments', icon: CreditCard, labelKey: 'nav.payments' },
  { path: '/invoices', icon: FileText, labelKey: 'nav.invoices' },
];

const MobileNav = React.memo(function MobileNav({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const stores = useAuthStore((s) => s.stores);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const updateToken = useAuthStore((s) => s.updateToken);
  const setActiveStore = useAuthStore((s) => s.setActiveStore);
  const selectStore = useSelectStore();
  const allStoresQuery = useAllStores(isAdmin);
  const qc = useQueryClient();

  const displayStores = isAdmin && allStoresQuery.data
    ? allStoresQuery.data.map((s: any) => ({ storeId: String(s.id), store: { id: s.id, name: s.name, code: null, theme: 'cream' }, role: -1 }))
    : stores;

  const handleStoreSwitch = useCallback(
    (storeId: string) => {
      selectStore.mutate(
        { storeId },
        {
          onSuccess: (data: any) => {
            updateToken(data.token);
            setActiveStore(storeId);
            qc.invalidateQueries();
          },
        },
      );
    },
    [selectStore, updateToken, setActiveStore, qc],
  );

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 flex items-center justify-between">
        <Logo className="h-10 text-[#c8a96e]" />
        <button onClick={onClose} className="rounded p-1 text-primary-400 hover:text-white">
          ✕
        </button>
      </div>

      {(isAdmin ? displayStores.length > 0 : displayStores.length > 1) && (
        <MobileStoreDropdown
          stores={displayStores}
          activeStoreId={activeStoreId}
          isAdmin={isAdmin}
          onSwitch={handleStoreSwitch}
        />
      )}

      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <a
                href={item.path}
                onClick={onClose}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-primary-200 hover:bg-primary-800 hover:text-white"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-primary-800 pt-4 flex flex-col gap-1">
        {isAdmin && (
          <a
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-primary-200 hover:bg-primary-800 hover:text-white"
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span>{t('nav.admin')}</span>
          </a>
        )}
        <a
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-primary-200 hover:bg-primary-800 hover:text-white"
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span>{t('nav.settings')}</span>
        </a>
      </div>
    </div>
  );
});

function MobileStoreDropdown({ stores, activeStoreId, isAdmin, onSwitch }: {
  stores: { storeId: string; store: { name: string } }[];
  activeStoreId: string | null;
  isAdmin: boolean;
  onSwitch: (storeId: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeStore = stores.find((s) => s.storeId === activeStoreId) ?? stores[0];
  const label = activeStore
    ? (isAdmin ? `${activeStore.storeId}  |  ${activeStore.store.name}` : activeStore.store.name)
    : '';

  return (
    <div ref={ref} className="mb-4 border-b border-primary-800 pb-4">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md bg-primary-800 px-3 py-2 text-body-sm text-white outline-none focus:ring-2 focus:ring-primary-500"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-primary-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute start-0 end-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-primary-700 bg-primary-800 p-1 shadow-lg">
          {stores.map((s: any) => {
            const selected = s.storeId === activeStoreId;
            return (
              <button
                key={s.storeId}
                type="button"
                onClick={() => { onSwitch(s.storeId); setOpen(false); }}
                className={`flex w-full items-center rounded-md px-3 py-2 text-body-sm transition-colors ${selected ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-700 hover:text-white'}`}
              >
                {isAdmin ? `${s.storeId}  |  ${s.store.name}` : s.store.name}
              </button>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
