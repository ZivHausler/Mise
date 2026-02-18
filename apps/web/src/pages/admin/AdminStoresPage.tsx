import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import { useAdminStores, useAdminStoreMembers, useAdminUpdateStore } from '@/api/hooks';
import { ROLE_LABELS } from '@/constants/defaults';

export default function AdminStoresPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const { data, isLoading } = useAdminStores(page, 20, search);
  const { data: members, isLoading: membersLoading } = useAdminStoreMembers(expandedStore);
  const updateStore = useAdminUpdateStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

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
      <h1 className="text-2xl font-bold text-neutral-900">{t('admin.stores.title')}</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('admin.stores.searchPlaceholder')}
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
              <th className="w-10"></th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.stores.name')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.stores.address')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.stores.members')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.stores.created')}</th>
              <th className="text-end px-4 py-3 font-medium text-neutral-600">{t('admin.users.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">{t('common.loading')}</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">{t('admin.stores.noStores')}</td></tr>
            ) : (
              data?.items?.map((store) => (
                <>
                  <tr key={store.id} className="hover:bg-neutral-50">
                    <td className="px-2">
                      <button
                        onClick={() => setExpandedStore(expandedStore === store.id ? null : store.id)}
                        className="p-1 rounded hover:bg-neutral-100"
                      >
                        {expandedStore === store.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {editingStore === store.id ? (
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="border border-neutral-300 rounded px-2 py-1 text-sm w-full" />
                      ) : store.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {editingStore === store.id ? (
                        <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="border border-neutral-300 rounded px-2 py-1 text-sm w-full" />
                      ) : (store.address || '-')}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{store.memberCount}</td>
                    <td className="px-4 py-3 text-neutral-600">{new Date(store.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-end">
                      {editingStore === store.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-neutral-100"><Check className="w-4 h-4 text-green-600" /></button>
                          <button onClick={() => setEditingStore(null)} className="p-1.5 rounded-lg hover:bg-neutral-100"><X className="w-4 h-4 text-red-600" /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(store)} className="p-1.5 rounded-lg hover:bg-neutral-100"><Pencil className="w-4 h-4 text-neutral-600" /></button>
                      )}
                    </td>
                  </tr>
                  {expandedStore === store.id && (
                    <tr key={`${store.id}-members`}>
                      <td colSpan={6} className="px-8 py-3 bg-neutral-50">
                        {membersLoading ? (
                          <p className="text-sm text-neutral-400">{t('common.loading')}</p>
                        ) : members?.length === 0 ? (
                          <p className="text-sm text-neutral-400">{t('admin.stores.noMembers')}</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-neutral-500 uppercase">{t('admin.stores.memberList')}</p>
                            {members?.map((member) => (
                              <div key={member.userId} className="flex items-center gap-4 text-sm">
                                <span className="font-medium text-neutral-900">{member.name}</span>
                                <span className="text-neutral-500">{member.email}</span>
                                <span className="text-xs px-2 py-0.5 bg-neutral-200 rounded-full">{ROLE_LABELS[member.role] ?? 'Unknown'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
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
    </div>
  );
}
