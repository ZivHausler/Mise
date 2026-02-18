import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminAuditLog } from '@/api/hooks';

export default function AdminAuditLogPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useAdminAuditLog(page, 20, { method: method || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });

  const methodColor = (m: string) => {
    switch (m) {
      case 'GET': return 'bg-blue-50 text-blue-700';
      case 'POST': return 'bg-green-50 text-green-700';
      case 'PATCH': return 'bg-amber-50 text-amber-700';
      case 'PUT': return 'bg-amber-50 text-amber-700';
      case 'DELETE': return 'bg-red-50 text-red-700';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t('admin.auditLog.title')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={method}
          onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{t('admin.auditLog.allMethods')}</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PATCH">PATCH</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={t('admin.auditLog.from')}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={t('admin.auditLog.to')}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.auditLog.user')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.auditLog.method')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.auditLog.path')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.auditLog.statusCode')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.auditLog.ip')}</th>
              <th className="text-start px-4 py-3 font-medium text-neutral-600">{t('admin.auditLog.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">{t('common.loading')}</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">{t('admin.auditLog.noEntries')}</td></tr>
            ) : (
              data?.items?.map((entry) => (
                <tr key={entry.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-900">{entry.userEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium ${methodColor(entry.method)}`}>{entry.method}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 font-mono text-xs max-w-xs truncate">{entry.path}</td>
                  <td className="px-4 py-3 text-neutral-600">{entry.statusCode}</td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{entry.ip}</td>
                  <td className="px-4 py-3 text-neutral-600">{new Date(entry.createdAt).toLocaleString()}</td>
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
    </div>
  );
}
