import React, { useState, useCallback, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomTabs } from './BottomTabs';
import { PageLoading } from './Feedback';

export const AppShell = React.memo(function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuClick = useCallback(() => setDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="flex min-h-screen">
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
        <div className="flex-1 pb-16 lg:pb-0">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </div>
        <BottomTabs />
      </div>

    </div>
  );
});

// Simple mobile nav reusing the same items as sidebar
const navItems = [
  { path: '/', labelKey: 'nav.dashboard' },
  { path: '/orders', labelKey: 'nav.orders' },
  { path: '/recipes', labelKey: 'nav.recipes' },
  { path: '/inventory', labelKey: 'nav.inventory' },
  { path: '/customers', labelKey: 'nav.customers' },
  { path: '/payments', labelKey: 'nav.payments' },
  { path: '/settings', labelKey: 'nav.settings' },
];

const MobileNav = React.memo(function MobileNav({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 flex items-center justify-between">
        <span className="font-heading text-h3 text-white">Mise</span>
        <button onClick={onClose} className="rounded p-1 text-primary-400 hover:text-white">
          ✕
        </button>
      </div>
      <nav>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <a
                href={item.path}
                onClick={onClose}
                className="block rounded-md px-3 py-2.5 text-body-sm text-primary-200 hover:bg-primary-800 hover:text-white"
              >
                {t(item.labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
});
