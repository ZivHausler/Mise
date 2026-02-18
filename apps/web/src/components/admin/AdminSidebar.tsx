import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Users, Store, Mail, FileText, ArrowLeft } from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, labelKey: 'admin.nav.dashboard', exact: true },
  { path: '/admin/users', icon: Users, labelKey: 'admin.nav.users' },
  { path: '/admin/stores', icon: Store, labelKey: 'admin.nav.stores' },
  { path: '/admin/invitations', icon: Mail, labelKey: 'admin.nav.invitations' },
  { path: '/admin/audit-log', icon: FileText, labelKey: 'admin.nav.auditLog' },
];

export function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-white border-e border-neutral-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-900">{t('admin.nav.title')}</h2>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-200">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('admin.nav.backToApp')}
        </Link>
      </div>
    </aside>
  );
}
