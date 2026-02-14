import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, LayoutGrid, List, ChevronRight } from 'lucide-react';
import { Page, PageHeader } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, StatusBadge, EmptyState, type Column } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { useOrders, useUpdateOrder } from '@/api/hooks';
import type { OrderStatus } from '@mise/shared';

type ViewMode = 'pipeline' | 'list';

const statusLabels: Record<OrderStatus, string> = {
  received: 'Received',
  in_progress: 'In Progress',
  ready: 'Ready',
  delivered: 'Delivered',
};

const nextStatus: Record<string, OrderStatus | null> = {
  received: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
  delivered: null,
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: orders, isLoading } = useOrders();
  const updateOrder = useUpdateOrder();
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');

  const handleAdvance = useCallback(
    (order: any) => {
      const next = nextStatus[order.status];
      if (next) updateOrder.mutate({ id: order.id, status: next });
    },
    [updateOrder]
  );

  const ordersByStatus = useMemo(() => {
    if (!orders) return {} as Record<string, any[]>;
    const grouped: Record<string, any[]> = { received: [], in_progress: [], ready: [], delivered: [] };
    (orders as any[]).forEach((o) => {
      if (grouped[o.status]) grouped[o.status].push(o);
    });
    return grouped;
  }, [orders]);

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'orderNumber', header: '#', sortable: true },
      { key: 'customerName', header: t('orders.customer', 'Customer'), sortable: true },
      {
        key: 'status',
        header: t('orders.statusLabel', 'Status'),
        align: 'center',
        render: (row: any) => (
          <StatusBadge variant={row.status} label={t(`orders.status.${row.status}`, statusLabels[row.status as OrderStatus])} />
        ),
      },
      { key: 'dueDate', header: t('orders.dueDate', 'Due Date'), sortable: true },
      {
        key: 'total',
        header: t('orders.total', 'Total'),
        align: 'end',
        render: (row: any) => <span className="font-mono">{row.total} NIS</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'end',
        render: (row: any) =>
          nextStatus[row.status] ? (
            <Button size="sm" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleAdvance(row); }}>
              <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
            </Button>
          ) : null,
      },
    ],
    [t, handleAdvance]
  );

  if (isLoading) return <PageLoading />;

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
                className={`rounded-e-md p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/orders/new')}>
              {t('orders.create', 'New Order')}
            </Button>
          </div>
        }
      />

      {viewMode === 'pipeline' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['received', 'in_progress', 'ready', 'delivered'] as OrderStatus[]).map((status) => (
            <div key={status} className="rounded-lg border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-100 p-3">
                <StatusBadge variant={status} label={t(`orders.status.${status}`, statusLabels[status])} />
                <span className="text-caption font-medium text-neutral-500">{ordersByStatus[status]?.length ?? 0}</span>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {(ordersByStatus[status] ?? []).length === 0 ? (
                  <p className="py-4 text-center text-caption text-neutral-400">{t('common.noResults')}</p>
                ) : (
                  (ordersByStatus[status] ?? []).map((order: any) => (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="cursor-pointer rounded-md border border-neutral-100 p-3 transition-shadow hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm font-medium text-neutral-800">#{order.orderNumber ?? order.id}</span>
                        {nextStatus[status] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAdvance(order); }}
                            className="rounded p-1 text-neutral-400 hover:bg-primary-50 hover:text-primary-500"
                          >
                            <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                          </button>
                        )}
                      </div>
                      <p className="text-caption text-neutral-500">{order.customerName ?? 'Customer'}</p>
                      {order.dueDate && <p className="mt-1 text-caption text-neutral-400">{order.dueDate}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(orders as any[]) ?? []}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => navigate(`/orders/${row.id}`)}
          searchable
          searchPlaceholder={t('orders.searchPlaceholder', 'Search orders...')}
          emptyTitle={t('orders.empty', 'No orders yet')}
          emptyDescription={t('orders.emptyDesc', 'Create your first order to get started.')}
        />
      )}
    </Page>
  );
}
