import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, LayoutGrid, List, Calendar, ChevronRight, ChevronLeft, BadgeDollarSign, X } from 'lucide-react';
import OrderCalendar from '@/components/OrderCalendar';
import { Page, PageHeader } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, StatusBadge, EmptyState, type Column } from '@/components/DataDisplay';
import { PageSkeleton } from '@/components/Feedback';
import { useOrders, useOrdersPaginated, useUpdateOrderStatus, usePaymentStatuses } from '@/api/hooks';
import { ORDER_STATUS, STATUS_LABELS, getStatusLabel } from '@/utils/orderStatus';
import { useFormatDate } from '@/utils/dateFormat';
import { useAppStore } from '@/store/app';
import { DateFilterDropdown } from '@/components/DateFilterDropdown';

const STATUS_DISPLAY: Record<string, string> = {
  received: 'Received',
  in_progress: 'In Progress',
  ready: 'Ready',
  delivered: 'Delivered',
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const updateOrderStatus = useUpdateOrderStatus();
  const { data: paymentStatuses } = usePaymentStatuses();
  const formatDate = useFormatDate();
  const viewMode = useAppStore((s) => s.ordersViewMode);
  const setViewMode = useAppStore((s) => s.setOrdersViewMode);

  // List view state (paginated, backend)
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [dateFrom, dateTo]);

  const listFilters = useMemo(() => {
    const f: { dateFrom?: string; dateTo?: string } = {};
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    return Object.keys(f).length ? f : undefined;
  }, [dateFrom, dateTo]);

  // Pipeline view uses all orders (no pagination)
  const { data: orders, isLoading: ordersLoading } = useOrders();
  // List view uses paginated endpoint
  const { data: paginatedData, isLoading: listLoading } = useOrdersPaginated(page, 20, listFilters);

  const paginatedResult = paginatedData as any;
  const listOrders = (paginatedResult?.orders as any[]) ?? [];
  const pagination = paginatedResult?.pagination;

  const isLoading = viewMode === 'list' ? listLoading : ordersLoading;

  const handleAdvance = useCallback(
    (order: any) => {
      const next = order.status + 1;
      if (next <= ORDER_STATUS.DELIVERED) updateOrderStatus.mutate({ id: order.id, status: next });
    },
    [updateOrderStatus]
  );

  const ordersByStatus = useMemo(() => {
    if (!orders) return {} as Record<number, any[]>;
    const grouped: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [] };
    (orders as any[]).forEach((o) => {
      const num = o.status;
      if (grouped[num]) grouped[num].push(o);
    });
    return grouped;
  }, [orders]);

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'orderNumber', header: t('orders.orderNumber', 'Order Number'), sortable: true, render: (row: any) => (
        <span className="inline-flex items-center gap-1">
          #{row.orderNumber}
          {paymentStatuses?.[row.id] === 'paid' && <BadgeDollarSign className="h-4 w-4 text-green-600" />}
        </span>
      ) },
      { key: 'customer', header: t('orders.customer', 'Customer'), sortable: true, render: (row: any) => row.customer?.name ?? '-' },
      {
        key: 'status',
        header: t('orders.statusLabel', 'Status'),
        align: 'center',
        render: (row: any) => {
          const label = getStatusLabel(row.status);
          return <StatusBadge variant={label} label={t(`orders.status.${label}`, label)} />;
        },
      },
      { key: 'dueDate', header: t('orders.dueDate', 'Due Date'), sortable: true, render: (row: any) => row.dueDate ? formatDate(row.dueDate) : '-' },
      {
        key: 'totalAmount',
        header: t('orders.total', 'Total'),
        align: 'end',
        render: (row: any) => <span className="font-mono">{row.totalAmount ?? 0} {t('common.currency')}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'end',
        render: (row: any) =>
          row.status < ORDER_STATUS.DELIVERED ? (
            <Button size="sm" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleAdvance(row); }}>
              <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
            </Button>
          ) : null,
      },
    ],
    [t, handleAdvance, formatDate, paymentStatuses]
  );

  if (isLoading) return <PageSkeleton />;

  const dateFilterToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <DateFilterDropdown
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      {(dateFrom || dateTo) && (
        <button
          onClick={() => { setDateFrom(''); setDateTo(''); }}
          className="inline-flex items-center gap-1 text-body-sm text-neutral-500 hover:text-neutral-700"
        >
          <X className="h-3.5 w-3.5" />
          {t('common.clearFilters', 'Clear')}
        </button>
      )}
    </div>
  );

  return (
    <Page>
      <PageHeader
        title={t('nav.orders')}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-neutral-200">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`rounded-s-md p-2 ${viewMode === 'pipeline' ? 'bg-primary-100 text-primary-700' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`rounded-e-md p-2 ${viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/orders/new')}>
              {t('orders.create', 'New Order')}
            </Button>
          </div>
        }
      />

      {viewMode === 'calendar' ? (
        <OrderCalendar />
      ) : viewMode === 'pipeline' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([ORDER_STATUS.RECEIVED, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.READY, ORDER_STATUS.DELIVERED] as const).map((status) => {
            const label = STATUS_LABELS[status];
            return (
              <div key={status} className="rounded-lg border border-neutral-200 bg-white">
                <div className="flex items-center justify-between border-b border-neutral-100 p-3">
                  <StatusBadge variant={label} label={t(`orders.status.${label}`, STATUS_DISPLAY[label])} />
                  <span className="text-caption font-medium text-neutral-500">{ordersByStatus[status]?.length ?? 0}</span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  {(ordersByStatus[status] ?? []).length === 0 ? (
                    <p className="py-4 text-center text-caption text-neutral-400">{t('common.noResults')}</p>
                  ) : (
                    (ordersByStatus[status] ?? []).map((order: any) => (
                      <div
                        key={String(order.id)}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="cursor-pointer rounded-md border border-neutral-100 p-3 transition-shadow hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-body-sm font-medium text-neutral-800">
                            #{order.orderNumber}
                            {paymentStatuses?.[order.id] === 'paid' && <BadgeDollarSign className="h-4 w-4 text-green-600" />}
                          </span>
                          {status < ORDER_STATUS.DELIVERED && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAdvance(order); }}
                              className="rounded p-1 text-neutral-400 hover:bg-primary-50 hover:text-primary-500"
                            >
                              <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                            </button>
                          )}
                        </div>
                        <p className="text-caption text-neutral-500">{order.customer?.name ?? 'Customer'}</p>
                        {order.dueDate && <p className="mt-1 text-caption text-neutral-400">{formatDate(order.dueDate)}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <DataTable
            columns={columns}
            data={listOrders}
            keyExtractor={(row: any) => String(row.id)}
            onRowClick={(row: any) => navigate(`/orders/${row.id}`)}
            searchable
            searchPlaceholder={t('orders.searchPlaceholder', 'Search orders...')}
            emptyTitle={t('orders.empty', 'No orders yet')}
            emptyDescription={t('orders.emptyDesc', 'Create your first order to get started.')}
            toolbar={dateFilterToolbar}
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
