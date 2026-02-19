import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, XCircle, Search, X, Filter, ChevronDown, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { useAdminInvitations, useAdminCreateStoreInvite, useAdminRevokeInvitation, useAdminStores, useAdminUsers } from '@/api/hooks';
import { ROLE_LABELS, STORE_ROLES } from '@/constants/defaults';
import { Button } from '@/components/Button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const STATUS_OPTIONS = ['all', 'pending', 'used', 'expired', 'revoked'] as const;
const ROLE_OPTIONS = [
  { value: '', label: 'All' },
  { value: String(STORE_ROLES.OWNER), label: ROLE_LABELS[STORE_ROLES.OWNER] },
  { value: String(STORE_ROLES.MANAGER), label: ROLE_LABELS[STORE_ROLES.MANAGER] },
  { value: String(STORE_ROLES.EMPLOYEE), label: ROLE_LABELS[STORE_ROLES.EMPLOYEE] },
];

function InvFilterDropdown({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const overflowRight = rect.right > window.innerWidth;
    const overflowLeft = rect.left < 0;
    if (overflowRight && !overflowLeft) setAlignEnd(true);
    else if (overflowLeft && !overflowRight) setAlignEnd(false);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-body-sm font-medium transition-colors ${count > 0 ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300' : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
      >
        <Filter className="h-3.5 w-3.5" />
        {label}
        {count > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[11px] font-semibold text-white">
            {count}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div ref={panelRef} className={`absolute top-full z-20 mt-1 min-w-[100px] rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 p-1 shadow-lg ${alignEnd ? 'end-0' : 'start-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function AdminInvitationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [storeIdFilter, setStoreIdFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const resetPage = useCallback(() => setPage(1), []);
  const debouncedSearch = useDebouncedValue(search, 500, resetPage);

  const { data: storesData } = useAdminStores(1, 100);
  const { data: usersData } = useAdminUsers(1, 100);

  const filters = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    storeId: storeIdFilter || undefined,
    userId: userIdFilter || undefined,
    role: roleFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading } = useAdminInvitations(page, 20, filters);
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

  const handleCopyLink = (inv: { id: string; token: string }) => {
    const link = `${window.location.origin}/invite/${inv.token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning-light text-warning border-warning/20';
      case 'used': return 'bg-success-light text-success border-success/20';
      case 'expired': return 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-700 dark:text-neutral-400 dark:border-neutral-600';
      case 'revoked': return 'bg-error-light text-error border-error/20';
      default: return 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-700 dark:text-neutral-400 dark:border-neutral-600';
    }
  };

  const storeFilterCount = storeIdFilter ? 1 : 0;
  const userFilterCount = userIdFilter ? 1 : 0;
  const roleFilterCount = roleFilter ? 1 : 0;
  const statusFilterCount = statusFilter !== 'all' ? 1 : 0;
  const dateFilterCount = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('admin.invitations.title')}</h1>
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          {t('admin.invitations.createStore')}
        </Button>
      </div>

      <div className="overflow-visible rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex flex-col gap-3 border-b border-neutral-200 dark:border-neutral-700 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-72">
            <Search className="absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.invitations.searchPlaceholder')}
              className="h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 ps-9 pe-3 text-body-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InvFilterDropdown label={t('admin.invitations.email')} count={userFilterCount}>
              {[
                { value: '', label: t('admin.invitations.status.all') },
                ...(usersData?.items?.map((u) => ({ value: u.id, label: u.email })) ?? []),
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => { setUserIdFilter(opt.value); setPage(1); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors truncate ${userIdFilter === opt.value ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                  {opt.label}
                </button>
              ))}
            </InvFilterDropdown>
            <InvFilterDropdown label={t('admin.invitations.store')} count={storeFilterCount}>
              {[
                { value: '', label: t('admin.invitations.status.all') },
                ...(storesData?.items?.map((s) => ({ value: s.id, label: s.name })) ?? []),
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => { setStoreIdFilter(opt.value); setPage(1); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors truncate ${storeIdFilter === opt.value ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                  {opt.label}
                </button>
              ))}
            </InvFilterDropdown>
            <InvFilterDropdown label={t('admin.invitations.role')} count={roleFilterCount}>
              {ROLE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => { setRoleFilter(opt.value); setPage(1); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${roleFilter === opt.value ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                  {opt.value ? opt.label : t('admin.invitations.status.all')}
                </button>
              ))}
            </InvFilterDropdown>
            <InvFilterDropdown label={t('admin.invitations.statusLabel')} count={statusFilterCount}>
              {STATUS_OPTIONS.map((s) => (
                <button key={s} type="button" onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${statusFilter === s ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                  {t(`admin.invitations.status.${s}`)}
                </button>
              ))}
            </InvFilterDropdown>
            <InvFilterDropdown label={t('admin.auditLog.date')} count={dateFilterCount}>
              <div className="p-2 space-y-2 min-w-[200px]">
                <div>
                  <label className="text-caption font-medium text-neutral-500 dark:text-neutral-400">{t('common.from')}</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="mt-1 h-8 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-2 text-body-sm text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-neutral-500 dark:text-neutral-400">{t('common.to')}</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="mt-1 h-8 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-2 text-body-sm text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
            </InvFilterDropdown>
            {(search || storeIdFilter || userIdFilter || roleFilter || statusFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setStoreIdFilter(''); setUserIdFilter(''); setRoleFilter(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="inline-flex items-center gap-1 text-body-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="h-3.5 w-3.5" />
                {t('common.clearFilters')}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700">
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.invitations.email')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.invitations.store')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.invitations.role')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.invitations.statusLabel')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.invitations.expires')}</th>
                <th className="text-end px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-body-sm text-neutral-400">{t('common.loading')}</td></tr>
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-body-sm text-neutral-400">{t('admin.invitations.noInvitations')}</td></tr>
              ) : (
                data?.items?.map((inv, i) => (
                  <tr key={inv.id} className={`border-b border-neutral-100 dark:border-neutral-700 transition-colors hover:bg-primary-50 dark:hover:bg-neutral-700 ${i % 2 === 1 ? 'bg-neutral-50 dark:bg-neutral-800/50' : ''}`}>
                    <td className="px-3 py-2 text-body-sm text-neutral-900 dark:text-neutral-100">{inv.email}</td>
                    <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">{inv.storeName ?? t('admin.invitations.createStoreType')}</td>
                    <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">{ROLE_LABELS[inv.role] ?? 'Unknown'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-medium ${statusColor(inv.status)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${inv.status === 'pending' ? 'bg-warning' : inv.status === 'used' ? 'bg-success' : inv.status === 'revoked' ? 'bg-error' : 'bg-neutral-400'}`} />
                        {t(`admin.invitations.status.${inv.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">{new Date(inv.expiresAt).toLocaleDateString('en-GB')}</td>
                    <td className="px-3 py-2 text-end">
                      {inv.status === 'pending' && (
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => handleCopyLink(inv)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title={t('admin.invitations.copyLink')}>
                            {copiedId === inv.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-neutral-500" />}
                          </button>
                          <button onClick={() => handleRevoke(inv.id)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title={t('admin.invitations.revoke')}>
                            <XCircle className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
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

    {/* Create modal */}
    {showCreateModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">{t('admin.invitations.createStoreTitle')}</h2>
          <form onSubmit={handleCreate}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('admin.invitations.emailPlaceholder')}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={() => {}} loading={createInvite.isPending}>
                {t('common.create')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
