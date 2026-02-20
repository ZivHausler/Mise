import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, BookOpen, Package, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

const tabs = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', tourId: 'bottomtab-dashboard' },
  { path: '/orders', icon: ClipboardList, labelKey: 'nav.orders', tourId: 'bottomtab-orders' },
  { path: '/recipes', icon: BookOpen, labelKey: 'nav.recipes', tourId: 'bottomtab-recipes' },
  { path: '/inventory', icon: Package, labelKey: 'nav.inventory', tourId: 'bottomtab-inventory' },
  { path: '/more', icon: MoreHorizontal, labelKey: 'nav.more', tourId: 'bottomtab-more' },
];

export const BottomTabs = React.memo(function BottomTabs() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-sticky flex items-center justify-around border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          data-tour={tab.tourId}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 px-3 py-3 text-[11px]',
              isActive ? 'text-primary-500' : 'text-neutral-400'
            )
          }
        >
          <tab.icon className="h-5 w-5" />
          <span>{t(tab.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
});
