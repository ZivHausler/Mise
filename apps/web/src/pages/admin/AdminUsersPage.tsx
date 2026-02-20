import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Shield, ShieldOff, Ban, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminUsers, useAdminToggleAdmin, useAdminToggleDisabled } from '@/api/hooks';
import { Button } from '@/components/Button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [includeAdmins, setIncludeAdmins] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 500, () => setPage(1));
  const { data, isLoading } = useAdminUsers(page, 20, debouncedSearch, includeAdmins);
  const toggleAdmin = useAdminToggleAdmin();
  const toggleDisabled = useAdminToggleDisabled();

  const handleToggleAdmin = (userId: string, currentIsAdmin: boolean) => {
    const action = currentIsAdmin ? t('admin.users.demoteConfirm') : t('admin.users.promoteConfirm');
    if (confirm(action)) {
      toggleAdmin.mutate({ userId, isAdmin: !currentIsAdmin });
    }
  };

  const handleToggleDisabled = (userId: string, currentlyDisabled: boolean) => {
    const action = currentlyDisabled ? t('admin.users.enableConfirm') : t('admin.users.disableConfirm');
    if (confirm(action)) {
      toggleDisabled.mutate({ userId, disabled: !currentlyDisabled });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('admin.users.title')}</h1>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-700 p-4">
          <div className="relative max-w-xs">
            <Search className="absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.users.searchPlaceholder')}
              className="h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 ps-9 pe-3 text-body-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <label className="flex items-center gap-2 text-body-sm text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeAdmins}
              onChange={(e) => { setIncludeAdmins(e.target.checked); setPage(1); }}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            {t('admin.users.includeAdmins')}
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700">
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.id')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.name')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.email')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.stores')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.status')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.role')}</th>
                <th className="text-end px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-body-sm text-neutral-400">{t('common.loading')}</td></tr>
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-body-sm text-neutral-400">{t('admin.users.noUsers')}</td></tr>
              ) : (
                data?.items?.map((user, i) => (
                  <tr key={user.id} className={`border-b border-neutral-100 dark:border-neutral-700 transition-colors hover:bg-primary-50 dark:hover:bg-neutral-700 ${i % 2 === 1 ? 'bg-neutral-50 dark:bg-neutral-800/50' : ''}`}>
                    <td className="px-3 py-2 text-body-sm text-neutral-500 dark:text-neutral-400 font-mono">{user.id}</td>
                    <td className="px-3 py-2 text-body-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</td>
                    <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">{user.email}</td>
                    <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">{user.storeCount}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-medium ${
                        user.disabledAt ? 'bg-error-light text-error border-error/20' : 'bg-success-light text-success border-success/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.disabledAt ? 'bg-error' : 'bg-success'}`} />
                        {user.disabledAt ? t('admin.users.disabled') : t('admin.users.active')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {user.isAdmin && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-medium bg-info-light text-info border-info/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-info" />
                          {t('admin.users.admin')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                          disabled={user.isAdmin}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          title={user.isAdmin ? t('admin.users.demote') : t('admin.users.promote')}
                        >
                          {user.isAdmin ? <ShieldOff className="w-4 h-4 text-amber-600" /> : <Shield className="w-4 h-4 text-blue-600" />}
                        </button>
                        <button
                          onClick={() => handleToggleDisabled(user.id, !!user.disabledAt)}
                          disabled={user.isAdmin}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          title={user.disabledAt ? t('admin.users.enable') : t('admin.users.disable')}
                        >
                          {user.disabledAt ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Ban className="w-4 h-4 text-red-600" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
            <span className="text-body-sm text-neutral-500 dark:text-neutral-400">
              {t('common.showingOf', '{{from}}-{{to}} of {{total}}', {
                from: (data.pagination.page - 1) * data.pagination.limit + 1,
                to: Math.min(data.pagination.page * data.pagination.limit, data.pagination.total),
                total: data.pagination.total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
              </Button>
              <span className="text-body-sm text-neutral-700 dark:text-neutral-300">
                {data.pagination.page} / {data.pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
