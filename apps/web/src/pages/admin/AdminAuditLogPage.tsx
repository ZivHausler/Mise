import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X, Search, Filter, ChevronDown } from 'lucide-react';
import { useAdminAuditLog, useAdminUsers, useAuditLogRequestBody, useAuditLogResponseBody, useAuditLogUpdates } from '@/api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAppStore } from '@/store/app';
import { formatTime } from '@/utils/dateFormat';

type AuditEntry = {
  id: number;
  userId: number;
  userEmail: string;
  storeId: number | null;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  createdAt: string;
};

function AuditFilterDropdown({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
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
        <div ref={panelRef} className={`absolute top-full z-20 mt-1 min-w-[140px] max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 p-1 shadow-lg ${alignEnd ? 'end-0' : 'start-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function UserFilterDropdown({
  label,
  count,
  users,
  userId,
  onSelect,
  allUsersLabel,
  searchPlaceholder,
}: {
  label: string;
  count: number;
  users: { id: number; email: string }[];
  userId: string;
  onSelect: (value: string) => void;
  allUsersLabel: string;
  searchPlaceholder: string;
}) {
  const [userSearch, setUserSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = userSearch
    ? users.filter((u) => u.email.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  return (
    <AuditFilterDropdown label={label} count={count}>
      <div className="p-1.5">
        <div className="relative mb-1">
          <Search className="absolute inset-y-0 start-0 my-auto ms-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            className="h-8 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 ps-8 pe-2.5 text-body-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {!userSearch && (
          <button
            type="button"
            onClick={() => { onSelect(''); setUserSearch(''); }}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${userId === '' ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
          >
            {allUsersLabel}
          </button>
        )}
        {filteredUsers.map((user) => (
          <button
            key={String(user.id)}
            type="button"
            onClick={() => { onSelect(String(user.id)); setUserSearch(''); }}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${userId === String(user.id) ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
          >
            {user.email}
          </button>
        ))}
        {filteredUsers.length === 0 && userSearch && (
          <p className="px-3 py-2 text-body-sm text-neutral-400 italic">No matches</p>
        )}
      </div>
    </AuditFilterDropdown>
  );
}

export default function AdminAuditLogPage() {
  const { t } = useTranslation();
  const timeFormat = useAppStore((s) => s.timeFormat);
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 500, () => setPage(1));
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const { data: requestBodyData, isLoading: isLoadingRequestBody } = useAuditLogRequestBody(selectedEntry?.id ?? null);
  const { data: responseBodyData, isLoading: isLoadingResponseBody } = useAuditLogResponseBody(selectedEntry?.id ?? null);

  const { data: usersData } = useAdminUsers(1, 100, undefined, true);

  const activeFilters = {
    method: method || undefined,
    statusCode: statusCode || undefined,
    userId: userId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useAdminAuditLog(page, 20, activeFilters);

  // Poll for new entries every 5s on page 1; invalidate main query when found
  const qc = useQueryClient();
  const latestTimestamp = data?.items?.[0]?.createdAt ?? null;
  const existingIds = data?.items?.map((e) => e.id) ?? [];
  const { data: updates } = useAuditLogUpdates(page === 1 ? latestTimestamp : null, existingIds, activeFilters);

  useEffect(() => {
    if (updates?.length) {
      qc.invalidateQueries({ queryKey: ['admin', 'auditLog'] });
    }
  }, [updates, qc]);

  useEffect(() => {
    if (selectedEntry) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [selectedEntry]);

  const displayItems = data?.items ?? [];

  const methodColor = (m: string) => {
    switch (m) {
      case 'GET': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'POST': return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'PATCH': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'PUT': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'DELETE': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400';
    }
  };

  const statusColorFn = (code: number) => {
    if (code >= 200 && code < 300) return 'text-green-700 dark:text-green-300';
    if (code >= 300 && code < 400) return 'text-blue-700 dark:text-blue-300';
    if (code >= 400 && code < 500) return 'text-amber-700 dark:text-amber-300';
    if (code >= 500) return 'text-red-700 dark:text-red-300';
    return 'text-neutral-600 dark:text-neutral-400';
  };

  const methodFilterCount = method ? 1 : 0;
  const statusFilterCount = statusCode ? 1 : 0;
  const userFilterCount = userId ? 1 : 0;
  const dateFilterCount = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  return (
    <>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('admin.auditLog.title')}</h1>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex flex-col gap-3 border-b border-neutral-200 dark:border-neutral-700 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.auditLog.searchPlaceholder')}
              className="h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 ps-9 pe-3 text-body-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <UserFilterDropdown
              label={t('admin.auditLog.user')}
              count={userFilterCount}
              users={usersData?.items ?? []}
              userId={userId}
              onSelect={(v) => { setUserId(v); setPage(1); }}
              allUsersLabel={t('admin.auditLog.allUsers')}
              searchPlaceholder={t('admin.auditLog.searchUserPlaceholder', 'Search email...')}
            />
            <AuditFilterDropdown label={t('admin.auditLog.method')} count={methodFilterCount}>
              {[
                { value: '', label: t('admin.auditLog.allMethods') },
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PATCH', label: 'PATCH' },
                { value: 'PUT', label: 'PUT' },
                { value: 'DELETE', label: 'DELETE' },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => { setMethod(opt.value); setPage(1); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${method === opt.value ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                  {opt.label}
                </button>
              ))}
            </AuditFilterDropdown>
            <AuditFilterDropdown label={t('admin.auditLog.statusCode')} count={statusFilterCount}>
              {[
                { value: '', label: t('admin.auditLog.allStatuses') },
                { value: '200', label: '200' },
                { value: '201', label: '201' },
                { value: '204', label: '204' },
                { value: '400', label: '400' },
                { value: '401', label: '401' },
                { value: '403', label: '403' },
                { value: '404', label: '404' },
                { value: '500', label: '500' },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => { setStatusCode(opt.value); setPage(1); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${statusCode === opt.value ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                  {opt.label}
                </button>
              ))}
            </AuditFilterDropdown>
            <AuditFilterDropdown label={t('admin.auditLog.date')} count={dateFilterCount}>
              <div className="p-2 space-y-2 w-[200px] max-w-full">
                <div>
                  <label className="text-caption font-medium text-neutral-500 dark:text-neutral-400">{t('admin.auditLog.from')}</label>
                  <input
                    type="datetime-local"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="mt-1 h-8 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-2 text-body-sm text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-neutral-500 dark:text-neutral-400">{t('admin.auditLog.to')}</label>
                  <input
                    type="datetime-local"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="mt-1 h-8 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-2 text-body-sm text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
            </AuditFilterDropdown>
            {(search || method || statusCode || userId || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setMethod(''); setStatusCode(''); setUserId(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="inline-flex items-center gap-1 text-body-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="h-3.5 w-3.5" />
                {t('common.clearFilters')}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700">
                <th className="sticky start-0 z-10 bg-neutral-100 dark:bg-neutral-700 text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.auditLog.user')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.auditLog.userId')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.auditLog.method')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.auditLog.path')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.auditLog.statusCode')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.auditLog.ip')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.auditLog.date')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-body-sm text-neutral-400">{t('common.loading')}</td></tr>
              ) : displayItems.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-body-sm text-neutral-400">{t('admin.auditLog.noEntries')}</td></tr>
              ) : (
                displayItems.map((entry, i) => (
                  <tr
                    key={String(entry.id)}
                    className={`group/row border-b border-neutral-100 dark:border-neutral-700 transition-colors hover:bg-primary-50 dark:hover:bg-neutral-700 cursor-pointer ${i % 2 === 1 ? 'bg-neutral-50 dark:bg-neutral-800/50' : ''}`}
                    onClick={() => setSelectedEntry(entry as AuditEntry)}
                  >
                    <td className={`sticky start-0 z-10 px-3 py-2 text-body-sm text-neutral-900 dark:text-neutral-100 ${i % 2 === 1 ? 'bg-neutral-50 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-800'} group-hover/row:bg-primary-50 dark:group-hover/row:bg-neutral-700 transition-colors`}>{entry.userEmail}</td>
                    <td className="px-3 py-2 text-body-sm text-neutral-500 dark:text-neutral-400 font-mono">{entry.userId}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-caption font-mono font-medium ${methodColor(entry.method)}`}>{entry.method}</span>
                    </td>
                    <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400 font-mono max-w-xs truncate">{entry.path}</td>
                    <td className={`px-3 py-2 text-body-sm font-mono font-medium ${statusColorFn(entry.statusCode)}`}>{entry.statusCode}</td>
                    <td className="px-3 py-2 text-body-sm text-neutral-500 dark:text-neutral-400 font-mono">{entry.ip}</td>
                    <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">{new Date(entry.createdAt).toLocaleDateString('en-GB')} {formatTime(new Date(entry.createdAt), timeFormat)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && (() => {
          const totalPages = Math.ceil(data.pagination.total / data.pagination.limit);
          return totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
              <span className="text-body-sm text-neutral-500 dark:text-neutral-400">
                {t('common.showingOf', '{{from}}-{{to}} of {{total}}', {
                  from: (page - 1) * data.pagination.limit + 1,
                  to: Math.min(page * data.pagination.limit, data.pagination.total),
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
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                </Button>
              </div>
            </div>
          );
        })()}
      </div>

    </div>

    {/* Detail Modal */}
    {selectedEntry && (
      <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 overscroll-contain" onClick={() => setSelectedEntry(null)}>
        <div
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl max-h-[80vh] flex flex-col mx-4 overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium ${methodColor(selectedEntry.method)}`}>
                {selectedEntry.method}
              </span>
              <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{selectedEntry.path}</span>
              <span className={`font-mono text-sm font-medium ${statusColorFn(selectedEntry.statusCode)}`}>
                {selectedEntry.statusCode}
              </span>
            </div>
            <button onClick={() => setSelectedEntry(null)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700">
              <X className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>

          <div className="px-6 py-3 border-b border-neutral-100 dark:border-neutral-700 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">{t('admin.auditLog.user')}: </span>
              <span className="text-neutral-900 dark:text-neutral-100">{selectedEntry.userEmail}</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">{t('admin.auditLog.ip')}: </span>
              <span className="font-mono text-neutral-700 dark:text-neutral-300">{selectedEntry.ip}</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">{t('admin.auditLog.userId')}: </span>
              <span className="font-mono text-neutral-700 dark:text-neutral-300 text-xs">{selectedEntry.userId}</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">{t('admin.auditLog.date')}: </span>
              <span className="text-neutral-700 dark:text-neutral-300">{new Date(selectedEntry.createdAt).toLocaleDateString('en-GB')} {formatTime(new Date(selectedEntry.createdAt), timeFormat)}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-2">{t('admin.auditLog.requestPayload')}</h3>
              {isLoadingRequestBody ? (
                <div className="flex items-center gap-2 py-3 text-sm text-neutral-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-500" />
                  {t('common.loading')}
                </div>
              ) : requestBodyData ? (
                <pre className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-xs font-mono text-neutral-800 dark:text-neutral-200 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {JSON.stringify(requestBodyData, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-neutral-400 italic">{t('admin.auditLog.noBody')}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-2">{t('admin.auditLog.responseBody')}</h3>
              {isLoadingResponseBody ? (
                <div className="flex items-center gap-2 py-3 text-sm text-neutral-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-500" />
                  {t('common.loading')}
                </div>
              ) : responseBodyData ? (
                <pre className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-xs font-mono text-neutral-800 dark:text-neutral-200 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {JSON.stringify(responseBodyData, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-neutral-400 italic">{t('admin.auditLog.noBody')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
