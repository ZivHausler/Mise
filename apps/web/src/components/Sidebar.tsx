import React, { useCallback } from 'react';
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
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useSelectStore, useAllStores, useFeatureFlags } from '@/api/hooks';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', tourId: 'sidebar-dashboard' },
  { path: '/inventory', icon: Package, labelKey: 'nav.inventory', tourId: 'sidebar-inventory' },
  { path: '/recipes', icon: BookOpen, labelKey: 'nav.recipes', tourId: 'sidebar-recipes' },
  { path: '/customers', icon: Users, labelKey: 'nav.customers', tourId: 'sidebar-customers' },
  { path: '/orders', icon: ClipboardList, labelKey: 'nav.orders', tourId: 'sidebar-orders' },
  { path: '/payments', icon: CreditCard, labelKey: 'nav.payments', tourId: 'sidebar-payments' },
  { path: '/production', icon: Factory, labelKey: 'nav.production', tourId: 'sidebar-production' },
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

  // For admins, show all stores in the system; for non-admins, show their stores
  const displayStores = isAdmin && allStoresQuery.data
    ? allStoresQuery.data.map((s) => ({ storeId: s.id, storeName: s.name, role: -1 }))
    : stores;

  const handleToggle = useCallback(() => toggleSidebar(), [toggleSidebar]);

  const handleStoreSwitch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const storeId = e.target.value;
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
          <div className="relative mb-3 px-3">
            <select
              onChange={handleStoreSwitch}
              value={activeStoreId || displayStores[0]?.storeId || ''}
              className="w-full appearance-none rounded-md bg-primary-800 px-3 py-2 pe-8 text-body-sm text-white outline-none focus:ring-2 focus:ring-primary-500"
            >
              {isAdmin && <option value="" disabled>{t('nav.selectStore', 'Select a store')}</option>}
              {displayStores.map((s) => (
                <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400" />
          </div>
        )}
        <ul className="flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
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
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-primary-800 py-4 px-2">
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
