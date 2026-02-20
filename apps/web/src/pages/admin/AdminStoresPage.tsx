import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Check, X, Filter } from 'lucide-react';
import { useAdminStores, useAdminStoreMembers, useAdminUpdateStore } from '@/api/hooks';
import { ROLE_LABELS } from '@/constants/defaults';
import { Button } from '@/components/Button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function StoreFilterDropdown({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
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

export default function AdminStoresPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 500, () => setPage(1));
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const { data: allStoresData } = useAdminStores(1, 500);
  const { data: rawData, isLoading } = useAdminStores(page, 20, debouncedSearch);

  const data = selectedStoreId && rawData ? {
    ...rawData,
    items: rawData.items?.filter((s) => s.id === selectedStoreId),
  } : rawData;
  const { data: members, isLoading: membersLoading } = useAdminStoreMembers(expandedStore);
  const updateStore = useAdminUpdateStore();

  const startEdit = (store: { id: string; name: string; address: string | null }) => {
    setEditingStore(store.id);
    setEditName(store.name);
    setEditAddress(store.address ?? '');
  };

  const saveEdit = () => {
    if (editingStore) {
      updateStore.mutate({ storeId: editingStore, name: editName, address: editAddress || undefined });
      setEditingStore(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('admin.stores.title')}</h1>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex flex-col gap-3 border-b border-neutral-200 dark:border-neutral-700 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-72">
            <Search className="absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.stores.searchPlaceholder')}
              className="h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 ps-9 pe-3 text-body-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StoreFilterDropdown label={t('admin.stores.title')} count={selectedStoreId ? 1 : 0}>
              {[
                { value: '', label: t('admin.stores.allStores') },
                ...(allStoresData?.items?.map((s) => ({ value: s.id, label: s.name })) ?? []),
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => {
                  setSelectedStoreId(opt.value);
                  setPage(1);
                }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors truncate ${selectedStoreId === opt.value ? 'bg-primary-50 text-primary-700 dark:bg-neutral-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                  {opt.label}
                </button>
              ))}
            </StoreFilterDropdown>
            {(search || selectedStoreId) && (
              <button
                onClick={() => { setSearch(''); setSelectedStoreId(''); setPage(1); }}
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
                <th className="w-px"></th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.stores.name')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.stores.address')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.stores.members')}</th>
                <th className="text-start px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.stores.created')}</th>
                <th className="text-end px-3 py-2 text-body-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('admin.users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-body-sm text-neutral-400">{t('common.loading')}</td></tr>
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-body-sm text-neutral-400">{t('admin.stores.noStores')}</td></tr>
              ) : (
                data?.items?.map((store, i) => (
                  <React.Fragment key={store.id}>
                    <tr className={`border-b border-neutral-100 dark:border-neutral-700 transition-colors hover:bg-primary-50 dark:hover:bg-neutral-700 ${i % 2 === 1 ? 'bg-neutral-50 dark:bg-neutral-800/50' : ''}`}>
                      <td className="px-2">
                        <button
                          onClick={() => setExpandedStore(expandedStore === store.id ? null : store.id)}
                          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          {expandedStore === store.id ? <ChevronUp className="w-4 h-4 text-neutral-600 dark:text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-body-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {editingStore === store.id ? (
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-2 text-body-sm text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-full" />
                        ) : store.name}
                      </td>
                      <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">
                        {editingStore === store.id ? (
                          <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="h-8 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-2 text-body-sm text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-full" />
                        ) : (store.address || '-')}
                      </td>
                      <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">{store.memberCount}</td>
                      <td className="px-3 py-2 text-body-sm text-neutral-600 dark:text-neutral-400">{new Date(store.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="px-3 py-2 text-end">
                        {editingStore === store.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"><Check className="w-4 h-4 text-green-600" /></button>
                            <button onClick={() => setEditingStore(null)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"><X className="w-4 h-4 text-red-600" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(store)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"><Pencil className="w-4 h-4 text-neutral-600 dark:text-neutral-400" /></button>
                        )}
                      </td>
                    </tr>
                    {expandedStore === store.id && (
                      <tr key={`${store.id}-members`}>
                        <td colSpan={6} className="px-8 py-0 bg-neutral-50 dark:bg-neutral-800/50">
                          <div className="animate-expand-down overflow-hidden">
                            <div className="py-3">
                              {membersLoading ? (
                                <p className="text-body-sm text-neutral-400">{t('common.loading')}</p>
                              ) : members?.length === 0 ? (
                                <p className="text-body-sm text-neutral-400">{t('admin.stores.noMembers')}</p>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-caption font-medium text-neutral-500 dark:text-neutral-400 uppercase">{t('admin.stores.memberList')}</p>
                                  {members?.map((member) => (
                                    <div key={member.userId} className="flex items-center gap-4 text-body-sm">
                                      <span className="font-medium text-neutral-900 dark:text-neutral-100">{member.name}</span>
                                      <span className="text-neutral-500 dark:text-neutral-400">{member.email}</span>
                                      <span className="text-caption px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">{ROLE_LABELS[member.role] ?? 'Unknown'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
