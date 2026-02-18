import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Shield, ShieldOff, Ban, CheckCircle } from 'lucide-react';
import { useAdminUsers, useAdminToggleAdmin, useAdminToggleDisabled } from '@/api/hooks';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { data, isLoading } = useAdminUsers(page, 20, search);
  const toggleAdmin = useAdminToggleAdmin();
  const toggleDisabled = useAdminToggleDisabled();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

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
      <h1 className="text-2xl font-bold text-neutral-900">{t('admin.users.title')}</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('admin.users.searchPlaceholder')}
            className="w-full ps-10 pe-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
          {t('common.search')}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.users.name')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.users.email')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.users.stores')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.users.status')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.users.role')}</th>
              <th className="text-end px-4 py-3 font-medium text-neutral-600">{t('admin.users.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">{t('common.loading')}</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">{t('admin.users.noUsers')}</td></tr>
            ) : (
              data?.items?.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{user.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{user.storeCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.disabledAt ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {user.disabledAt ? t('admin.users.disabled') : t('admin.users.active')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isAdmin && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {t('admin.users.admin')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                        title={user.isAdmin ? t('admin.users.demote') : t('admin.users.promote')}
                      >
                        {user.isAdmin ? <ShieldOff className="w-4 h-4 text-amber-600" /> : <Shield className="w-4 h-4 text-blue-600" />}
                      </button>
                      <button
                        onClick={() => handleToggleDisabled(user.id, !!user.disabledAt)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
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

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg disabled:opacity-50 hover:bg-neutral-50"
          >
            {t('common.previous')}
          </button>
          <span className="text-sm text-neutral-600">
            {page} / {data.pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
            className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg disabled:opacity-50 hover:bg-neutral-50"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
