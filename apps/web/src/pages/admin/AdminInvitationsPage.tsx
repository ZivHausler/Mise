import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, XCircle } from 'lucide-react';
import { useAdminInvitations, useAdminCreateStoreInvite, useAdminRevokeInvitation } from '@/api/hooks';
import { ROLE_LABELS } from '@/constants/defaults';

const STATUS_TABS = ['all', 'pending', 'used', 'expired', 'revoked'] as const;

export default function AdminInvitationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const { data, isLoading } = useAdminInvitations(page, 20, statusTab === 'all' ? undefined : statusTab);
  const createInvite = useAdminCreateStoreInvite();
  const revokeInvite = useAdminRevokeInvitation();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail) {
      createInvite.mutate({ email: newEmail }, {
        onSuccess: () => { setShowCreateModal(false); setNewEmail(''); },
      });
    }
  };

  const handleRevoke = (id: string) => {
    if (confirm(t('admin.invitations.revokeConfirm'))) {
      revokeInvite.mutate(id);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700';
      case 'used': return 'bg-green-50 text-green-700';
      case 'expired': return 'bg-neutral-100 text-neutral-600';
      case 'revoked': return 'bg-red-50 text-red-700';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t('admin.invitations.title')}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          {t('admin.invitations.createStore')}
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatusTab(tab); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              statusTab === tab ? 'bg-white shadow-sm text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t(`admin.invitations.status.${tab}`)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.invitations.email')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.invitations.store')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.invitations.role')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.invitations.statusLabel')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.invitations.expires')}</th>
              <th className="text-end px-4 py-3 font-medium text-neutral-600">{t('admin.users.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">{t('common.loading')}</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">{t('admin.invitations.noInvitations')}</td></tr>
            ) : (
              data?.items?.map((inv) => (
                <tr key={inv.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-900">{inv.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{inv.storeName ?? t('admin.invitations.createStoreType')}</td>
                  <td className="px-4 py-3 text-neutral-600">{ROLE_LABELS[inv.role] ?? 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>
                      {t(`admin.invitations.status.${inv.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-end">
                    {inv.status === 'pending' && (
                      <button onClick={() => handleRevoke(inv.id)} className="p-1.5 rounded-lg hover:bg-neutral-100" title={t('admin.invitations.revoke')}>
                        <XCircle className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg disabled:opacity-50 hover:bg-neutral-50">{t('common.previous')}</button>
          <span className="text-sm text-neutral-600">{page} / {data.pagination.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page === data.pagination.totalPages} className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg disabled:opacity-50 hover:bg-neutral-50">{t('common.next')}</button>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('admin.invitations.createStoreTitle')}</h2>
            <form onSubmit={handleCreate}>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('admin.invitations.emailPlaceholder')}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 rounded-lg">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700" disabled={createInvite.isPending}>
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
