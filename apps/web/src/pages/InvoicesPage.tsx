import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { Page, PageHeader } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, StatusBadge, EmptyState, type Column } from '@/components/DataDisplay';
import { PageSkeleton } from '@/components/Feedback';
import { useInvoices, downloadPdf } from '@/api/hooks';
import { useFormatDate } from '@/utils/dateFormat';
import { DateFilterDropdown } from '@/components/DateFilterDropdown';
import { FilterDropdown, FilterOption } from '@/components/FilterDropdown';
import { useAppStore } from '@/store/app';

export default function InvoicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const language = useAppStore((s) => s.language);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = useMemo(() => {
    const f: { type?: string; dateFrom?: string; dateTo?: string } = {};
    if (filterType) f.type = filterType;
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    return Object.keys(f).length ? f : undefined;
  }, [filterType, dateFrom, dateTo]);

  const { data: invoicesData, isLoading } = useInvoices(page, 10, filters);

  useEffect(() => { setPage(1); }, [filterType, dateFrom, dateTo]);

  const invoicesResult = invoicesData as any;
  const list = (invoicesResult?.invoices as any[]) ?? [];
  const pagination = invoicesResult?.pagination;

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: 'issuedAt',
        header: t('invoices.date', 'Date'),
        sortable: true,
        sticky: true,
        render: (row: any) => row.issuedAt ? formatDate(row.issuedAt) : '-',
      },
      {
        key: 'orderId',
        header: t('invoices.orderNumber', 'Order Number'),
        render: (row: any) => `#${row.orderNumber ?? row.orderId}`,
      },
      {
        key: 'displayNumber',
        header: t('invoices.invoiceNumber', 'Invoice Number'),
        render: (row: any) => row.displayNumber,
      },
      {
        key: 'type',
        header: t('invoices.type', 'Type'),
        render: (row: any) => (
          <StatusBadge
            variant={row.type === 'credit_note' ? 'error' : 'success'}
            label={row.type === 'credit_note' ? t('invoices.creditNote', 'Credit Note') : t('invoices.taxInvoice', 'Tax Invoice')}
          />
        ),
      },
      {
        key: 'customerName',
        header: t('invoices.customer', 'Customer'),
        sortable: true,
        render: (row: any) => row.customer?.name ?? '-',
      },
      {
        key: 'totalAmount',
        header: t('invoices.amount', 'Amount'),
        align: 'end' as const,
        sortable: true,
        render: (row: any) => {
          const amount = row.pricing?.totalAmount ?? 0;
          const abs = Math.abs(amount);
          return <span className="font-mono" dir="ltr">{amount < 0 ? '-' : ''}{abs}{t('common.currency')}</span>;
        },
      },
      {
        key: 'actions',
        header: '',
        shrink: true,
        render: (row: any) => (
          <button
            className="p-1.5 ms-4 text-neutral-400 hover:text-neutral-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              downloadPdf(`/invoices/${row.id}/pdf?lang=${language}`, `invoice-${row.displayNumber}.pdf`);
            }}
            title={t('invoices.download', 'Download')}
          >
            <Download className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [t, formatDate, language]
  );

  if (isLoading) return <PageSkeleton />;

  return (
    <Page>
      <PageHeader title={t('invoices.title', 'Invoices')} />

      {list.length === 0 && (!pagination || pagination.total === 0) && !filterType && !dateFrom && !dateTo ? (
        <EmptyState
          title={t('invoices.empty', 'No invoices yet')}
          description={t('invoices.emptyDescription', 'Invoices you generate from orders will appear here.')}
          icon={<FileText className="h-16 w-16" />}
        />
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-4">
            <FilterDropdown
              label={t('invoices.type', 'Type')}
              count={filterType ? 1 : 0}
            >
              {[
                { value: '', label: t('invoices.allTypes', 'All Types') },
                { value: 'invoice', label: t('invoices.taxInvoice', 'Tax Invoice') },
                { value: 'credit_note', label: t('invoices.creditNote', 'Credit Note') },
              ].map((opt) => (
                <FilterOption key={opt.value} selected={filterType === opt.value} onClick={() => setFilterType(opt.value)}>
                  {opt.label}
                </FilterOption>
              ))}
            </FilterDropdown>
            <DateFilterDropdown
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            {(filterType || dateFrom || dateTo) && (
              <button
                onClick={() => { setFilterType(''); setDateFrom(''); setDateTo(''); }}
                className="inline-flex items-center gap-1 text-body-sm text-neutral-500 hover:text-neutral-700"
              >
                <X className="h-3.5 w-3.5" />
                {t('common.clearFilters', 'Clear')}
              </button>
            )}
          </div>
          <DataTable
            columns={columns}
            data={list}
            keyExtractor={(row: any) => row.id}
            onRowClick={(row: any) => navigate(`/orders/${row.orderId}`)}
            searchable
            bare
          />
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
              <span className="text-body-sm text-neutral-500">
                {t('common.showingOf', '{{from}}-{{to}} of {{total}}', {
                  from: (pagination.page - 1) * pagination.limit + 1,
                  to: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total,
                })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                </Button>
                <span className="text-body-sm text-neutral-700">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
