import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Factory,
  BookOpen,
  Package,
  Users,
  CreditCard,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
import { NavItem } from './NavItem';
import { UpgradeHint } from './subscription/UpgradeHint';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useSelectStore, useAllStores, useSubscription } from '@/api/hooks';
import { STORE_ROLES } from '@/constants/defaults';
import { isTierHigher } from '@/utils/subscription';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', tourId: 'sidebar-dashboard' },
  { path: '/inventory', icon: Package, labelKey: 'nav.inventory', tourId: 'sidebar-inventory' },
  { path: '/recipes', icon: BookOpen, labelKey: 'nav.recipes', tourId: 'sidebar-recipes' },
  { path: '/customers', icon: Users, labelKey: 'nav.customers', tourId: 'sidebar-customers', featureFlag: 'customers' as const },
  { path: '/orders', icon: ClipboardList, labelKey: 'nav.orders', tourId: 'sidebar-orders', featureFlag: 'orders' as const },
  { path: '/payments', icon: CreditCard, labelKey: 'nav.payments', tourId: 'sidebar-payments', featureFlag: 'payments' as const },
  { path: '/invoices', icon: FileText, labelKey: 'nav.invoices', tourId: 'sidebar-invoices', featureFlag: 'invoices' as const },
  { path: '/production', icon: Factory, labelKey: 'nav.production', tourId: 'sidebar-production', featureFlag: 'production' as const },
];

const bottomItems = [
  { path: '/settings', icon: Settings, labelKey: 'nav.settings', tourId: 'sidebar-settings' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const stores = useAuthStore((s) => s.stores);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const updateToken = useAuthStore((s) => s.updateToken);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const setActiveStore = useAuthStore((s) => s.setActiveStore);
  const selectStore = useSelectStore();
  const allStoresQuery = useAllStores(isAdmin);
  const qc = useQueryClient();
  const { data: subscription } = useSubscription();
  const currentPlan = (subscription as any)?.planSlug ?? 'free';
  const activeRole = stores.find((s) => String(s.storeId) === String(activeStoreId))?.role;
  const isOwner = activeRole === STORE_ROLES.OWNER || isAdmin;
  const nextTier = currentPlan === 'free' ? 'basic' : currentPlan === 'basic' ? 'pro' : null;

  // For admins, show all stores in the system; for non-admins, show their stores
  const displayStores = isAdmin && allStoresQuery.data
    ? allStoresQuery.data.map((s) => ({ storeId: String(s.id), store: { id: s.id, name: s.name, code: null, theme: 'cream' }, role: -1 }))
    : stores;

  const handleToggle = useCallback(() => toggleSidebar(), [toggleSidebar]);

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
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-primary-900 text-primary-200 transition-all duration-slow h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      <div className={cn('flex items-center border-b border-primary-800 px-4 h-16', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && <Logo className="h-10 text-[#c8a96e]" />}
        <button
          onClick={handleToggle}
          className="rounded p-1.5 text-primary-400 hover:bg-primary-800 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" /> : <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {!collapsed && (isAdmin ? displayStores.length > 0 : displayStores.length > 1) && (
          <StoreDropdown
            stores={displayStores}
            activeStoreId={activeStoreId}
            isAdmin={isAdmin}
            onSwitch={handleStoreSwitch}
          />
        )}
        <ul className="flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavItem
                path={item.path}
                icon={item.icon}
                labelKey={item.labelKey}
                tourId={item.tourId}
                featureFlag={item.featureFlag}
                variant="sidebar"
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-primary-800 py-4 px-2">
        {isOwner && nextTier && !collapsed && (
          <div className="mb-2">
            <UpgradeHint targetPlan={nextTier} variant="sidebar" />
          </div>
        )}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm transition-colors mb-1',
                isActive
                  ? 'bg-primary-800 text-white border-s-4 border-primary-500'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
              )
            }
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{t('nav.admin')}</span>}
          </NavLink>
        )}
        {bottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-tour={item.tourId}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm transition-colors',
                isActive
                  ? 'bg-primary-800 text-white border-s-4 border-primary-500'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}

function StoreDropdown({ stores, activeStoreId, isAdmin, onSwitch }: {
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
    <div ref={ref} className="relative mb-3 px-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md bg-primary-800 px-3 py-2 text-body-sm text-white outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-primary-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute start-3 end-3 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-primary-700 bg-primary-800 p-1 shadow-lg">
          {stores.map((s) => {
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
  );
}
