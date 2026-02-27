import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, CreditCard, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Page, PageHeader } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, StatusBadge, EmptyState, type Column } from '@/components/DataDisplay';
import { PageSkeleton } from '@/components/Feedback';
import { LogPaymentModal } from '@/components/LogPaymentModal';
import { usePayments } from '@/api/hooks';
import { PAYMENT_METHODS, PAYMENT_METHOD_I18N } from '@/constants/defaults';
import { useFormatDate } from '@/utils/dateFormat';
import { DateFilterDropdown } from '@/components/DateFilterDropdown';
import { FilterDropdown, FilterOption } from '@/components/FilterDropdown';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const [searchParams] = useSearchParams();
  const defaultSearch = searchParams.get('search') ?? '';
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filters = useMemo(() => {
    const f: { status?: string; method?: string; dateFrom?: string; dateTo?: string } = {};
    if (filterStatus) f.status = filterStatus;
    if (filterMethod) f.method = filterMethod;
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    return Object.keys(f).length ? f : undefined;
  }, [filterStatus, filterMethod, dateFrom, dateTo]);
  const { data: paymentsData, isLoading } = usePayments(page, 10, filters);
  const [showAdd, setShowAdd] = useState(false);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterStatus, filterMethod, dateFrom, dateTo]);

  const paymentsResult = paymentsData as any;
  const list = (paymentsResult?.payments as any[]) ?? [];
  const pagination = paymentsResult?.pagination;

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'createdAt', header: t('payments.date', 'Date'), sortable: true, render: (row: any) => row.createdAt ? formatDate(row.createdAt) : '-'},
      { key: 'orderNumber', header: t('payments.order', 'Order'), render: (row: any) => `#${row.order?.number}` },
      { key: 'customerName', header: t('payments.customer', 'Customer'), sortable: true, render: (row: any) => row.customer?.name ?? '-' },
      {
        key: 'amount',
        header: t('payments.amount', 'Amount'),
        align: 'end' as const,
        sortable: true,
        render: (row: any) => <span className="font-mono">{row.amount} {t('common.currency')}</span>,
      },
      {
        key: 'method',
        header: t('payments.method', 'Method'),
        render: (row: any) => (
          <StatusBadge variant="info" label={row.method === 'cash' ? t('payments.cash', 'Cash') : t('payments.card', 'Card')} />
        ),
      },
      {
        key: 'status',
        header: t('payments.status', 'Status'),
        shrink: true,
        render: (row: any) => (
          <StatusBadge
            variant={row.status === 'refunded' ? 'error' : 'success'}
            label={row.status === 'refunded' ? t('payments.refunded', 'Refunded') : t('payments.completed', 'Completed')}
          />
        ),
      },
    ],
    [t]
  );

  if (isLoading) return <PageSkeleton />;

  return (
    <Page>
      <PageHeader
        title={t('nav.payments')}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            {t('payments.logPayment', 'Log Payment')}
          </Button>
        }
      />

      {list.length === 0 && (!pagination || pagination.total === 0) && !filterStatus && !filterMethod && !dateFrom && !dateTo ? (
        <EmptyState
          title={t('payments.empty', 'No payments yet')}
          description={t('payments.emptyDesc', 'Log your first payment.')}
          icon={<CreditCard className="h-16 w-16" />}
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
              {t('payments.logPayment', 'Log Payment')}
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-4">
            <FilterDropdown
              label={t('payments.status', 'Status')}
              count={filterStatus ? 1 : 0}
            >
              {[
                { value: '', label: t('common.allStatuses', 'All statuses') },
                { value: 'completed', label: t('payments.completed', 'Completed') },
                { value: 'refunded', label: t('payments.refunded', 'Refunded') },
              ].map((opt) => (
                <FilterOption key={opt.value} selected={filterStatus === opt.value} onClick={() => setFilterStatus(opt.value)}>
                  {opt.label}
                </FilterOption>
              ))}
            </FilterDropdown>
            <FilterDropdown
              label={t('payments.method', 'Method')}
              count={filterMethod ? 1 : 0}
            >
              {[
                { value: '', label: t('payments.allMethods', 'All methods') },
                ...PAYMENT_METHODS.map((m) => ({
                  value: m,
                  label: t(`payments.${PAYMENT_METHOD_I18N[m]}`, m),
                })),
              ].map((opt) => (
                <FilterOption key={opt.value} selected={filterMethod === opt.value} onClick={() => setFilterMethod(opt.value)}>
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
            {(filterStatus || filterMethod || dateFrom || dateTo) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterMethod(''); setDateFrom(''); setDateTo(''); }}
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
            searchable
            bare
            defaultSearch={defaultSearch}
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

      <LogPaymentModal open={showAdd} onClose={() => setShowAdd(false)} />
    </Page>
  );
}
