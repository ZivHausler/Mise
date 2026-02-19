import { useState, useCallback, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Globe, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { PageSkeleton } from '@/components/Feedback';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';

export default function AdminShell() {
  const { t, i18n } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const adminDarkMode = useAppStore((s) => s.adminDarkMode);
  const toggleAdminDarkMode = useAppStore((s) => s.toggleAdminDarkMode);
  const user = useAuthStore((s) => s.user);

  const handleMenuClick = useCallback(() => setDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);

  // Sync dark class on <html> so all dark: variants work globally
  useEffect(() => {
    document.documentElement.classList.toggle('dark', adminDarkMode);
    return () => { document.documentElement.classList.remove('dark'); };
  }, [adminDarkMode]);

  const toggleLanguage = useCallback(() => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  }, [i18n, setLanguage]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-primary-50 dark:bg-neutral-900">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-drawer lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={handleCloseDrawer} />
          <aside className="fixed inset-y-0 start-0 z-10 w-[260px] bg-white dark:bg-neutral-800 animate-slide-in">
            <AdminSidebar mobile onNavigate={handleCloseDrawer} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 flex h-14 items-center justify-between border-b border-neutral-200 dark:border-neutral-700 bg-primary-50 dark:bg-neutral-900 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleMenuClick}
              className="rounded-md p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 lg:hidden">
              <ArrowLeft className="h-4 w-4" />
              {t('admin.nav.backToApp')}
            </Link>
            <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 hidden lg:block">{t('admin.nav.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAdminDarkMode}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              aria-label={adminDarkMode ? t('admin.nav.lightMode') : t('admin.nav.darkMode')}
            >
              {adminDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <Globe className="h-4 w-4" />
              {i18n.language === 'he' ? 'EN' : 'HE'}
            </button>
            {user && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-body-sm font-medium text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
