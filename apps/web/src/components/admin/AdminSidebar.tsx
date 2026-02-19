import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Users, Store, Mail, FileText, ArrowLeft, X } from 'lucide-react';
import { cn } from '@/utils/cn';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, labelKey: 'admin.nav.dashboard', exact: true },
  { path: '/admin/users', icon: Users, labelKey: 'admin.nav.users' },
  { path: '/admin/stores', icon: Store, labelKey: 'admin.nav.stores' },
  { path: '/admin/invitations', icon: Mail, labelKey: 'admin.nav.invitations' },
  { path: '/admin/audit-log', icon: FileText, labelKey: 'admin.nav.auditLog' },
];

interface AdminSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function AdminSidebar({ mobile, onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-white dark:bg-neutral-800 border-e border-neutral-200 dark:border-neutral-700 h-full',
        mobile ? 'w-full' : 'hidden lg:flex w-64 min-h-screen'
      )}
    >
      <div className={cn('flex items-center border-b border-neutral-200 dark:border-neutral-700 px-4 h-14', mobile ? 'justify-between' : 'justify-start')}>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('admin.nav.title')}</h2>
        {mobile && (
          <button
            onClick={onNavigate}
            className="rounded p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" />
          {t('admin.nav.backToApp')}
        </Link>
      </div>
    </aside>
  );
}
