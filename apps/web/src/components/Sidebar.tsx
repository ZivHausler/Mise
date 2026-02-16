import React, { useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Package,
  Users,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/app';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/orders', icon: ClipboardList, labelKey: 'nav.orders' },
  { path: '/recipes', icon: BookOpen, labelKey: 'nav.recipes' },
  { path: '/inventory', icon: Package, labelKey: 'nav.inventory' },
  { path: '/customers', icon: Users, labelKey: 'nav.customers' },
  { path: '/payments', icon: CreditCard, labelKey: 'nav.payments' },
];

const bottomItems = [
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const handleToggle = useCallback(() => toggleSidebar(), [toggleSidebar]);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-primary-900 text-primary-200 transition-all duration-slow h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      <div className={cn('flex items-center border-b border-primary-800 px-4 h-16', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && <span className="font-heading text-h3 text-white">Mise</span>}
        <button
          onClick={handleToggle}
          className="rounded p-1.5 text-primary-400 hover:bg-primary-800 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" /> : <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
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
        {bottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
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
