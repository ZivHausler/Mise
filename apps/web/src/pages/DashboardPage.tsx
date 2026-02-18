import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Clock, AlertTriangle, Coins, Plus, BookOpen, CreditCard, ChevronDown, ChevronUp, BadgeDollarSign } from 'lucide-react';
import { Page, PageHeader, Section, Card, Row } from '@/components/Layout';
import { StatCard, StatusBadge } from '@/components/DataDisplay';
import { Button } from '@/components/Button';
import { PageLoading } from '@/components/Feedback';
import { useDashboardStats, useOrders, usePaymentStatuses } from '@/api/hooks';
import { ORDER_STATUS, getStatusLabel } from '@/utils/orderStatus';
import { useFormatDate } from '@/utils/dateFormat';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: paymentStatuses } = usePaymentStatuses();

  const formatDate = useFormatDate();
  const dashStats = stats as any;

  const ordersList = (orders as any[]) ?? [];

  const ordersByStatus = useMemo(() => {
    const grouped: Record<number, unknown[]> = { 0: [], 1: [], 2: [], 3: [] };
    ordersList.forEach((o) => {
      if (grouped[o.status]) grouped[o.status].push(o);
    });
    return grouped;
  }, [ordersList]);

  const todayStr = new Date().toDateString();
  const todayOrders = useMemo(() => ordersList.filter((o) => new Date(o.createdAt).toDateString() === todayStr).length, [ordersList, todayStr]);
  const pendingOrders = useMemo(() => ordersList.filter((o) => o.status !== ORDER_STATUS.DELIVERED).length, [ordersList]);

  const [expandedColumns, setExpandedColumns] = useState<Record<number, boolean>>({});
  const INITIAL_VISIBLE = 3;

  const toggleColumn = (status: number) => {
    setExpandedColumns((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  if (statsLoading || ordersLoading) return <PageLoading />;

  const statCards = [
    { label: t('dashboard.todaysOrders', "Today's Orders"), value: todayOrders, icon: <Package className="h-6 w-6" /> },
    { label: t('dashboard.pendingOrders', 'Pending Orders'), value: pendingOrders, icon: <Clock className="h-6 w-6" /> },
    { label: t('dashboard.lowStock', 'Low Stock'), value: dashStats?.lowStockItems ?? 0, icon: <AlertTriangle className="h-6 w-6" />, onClick: () => navigate('/inventory?status=low,ok') },
    { label: t('dashboard.todaysRevenue', "Today's Revenue"), value: `${dashStats?.todayRevenue ?? 0} ${t('common.currency', '₪')}`, icon: <Coins className="h-6 w-6" /> },
  ];

  const statusLabels: Record<string, string> = {
    received: t('orders.status.received', 'Received'),
    in_progress: t('orders.status.in_progress', 'In Progress'),
    ready: t('orders.status.ready', 'Ready'),
    delivered: t('orders.status.delivered', 'Delivered'),
  };

  return (
    <Page>
      <PageHeader
        title={t('dashboard.greeting', 'Good morning!')}
        subtitle={new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} onClick={s.onClick} />
        ))}
      </div>

      <Section title={t('dashboard.orderPipeline', 'Order Pipeline')}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([ORDER_STATUS.RECEIVED, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.READY, ORDER_STATUS.DELIVERED] as const).map((status) => {
            const label = getStatusLabel(status);
            const columnOrders = (ordersByStatus[status] ?? []) as any[];
            const isExpanded = expandedColumns[status];
            const visibleOrders = isExpanded ? columnOrders : columnOrders.slice(0, INITIAL_VISIBLE);
            const hiddenCount = columnOrders.length - INITIAL_VISIBLE;
            return (
            <div key={status} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <StatusBadge variant={label} label={statusLabels[label]} />
                <span className="text-caption font-medium text-neutral-500">
                  {columnOrders.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {visibleOrders.map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="cursor-pointer rounded-md border border-neutral-100 p-2 text-body-sm hover:bg-primary-50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1 font-medium text-neutral-800">
                        #{order.orderNumber}
                        {paymentStatuses?.[order.id] === 'paid' && <BadgeDollarSign className="h-4 w-4 text-green-600" />}
                      </p>
                      <p className="text-caption font-medium text-neutral-700">{order.totalAmount ?? 0} {t('common.currency', '₪')}</p>
                    </div>
                    <p className="text-caption text-neutral-500">{order.customerName ?? 'Customer'}</p>
                    <div className="mt-1 flex items-center justify-between text-caption text-neutral-400">
                      <span>{formatDate(order.createdAt)}</span>
                      {order.dueDate && (
                        <span>{t('orders.dueDate', 'Due')}: {formatDate(order.dueDate)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => toggleColumn(status)}
                    className="flex items-center justify-center gap-1 rounded-md border border-neutral-100 p-1.5 text-caption text-neutral-500 hover:bg-neutral-50"
                  >
                    {isExpanded ? (
                      <>{t('common.showLess', 'Show less')} <ChevronUp className="h-3 w-3" /></>
                    ) : (
                      <>{t('common.showMore', 'Show {{count}} more', { count: hiddenCount })} <ChevronDown className="h-3 w-3" /></>
                    )}
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </Section>

      <Section title={t('dashboard.quickActions', 'Quick Actions')}>
        <Card variant="flat" className="flex flex-col gap-2 lg:flex-row">
          <Button variant="primary" fullWidth icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/orders/new')}>
            {t('orders.create', 'New Order')}
          </Button>
          <Button variant="secondary" fullWidth icon={<BookOpen className="h-4 w-4" />} onClick={() => navigate('/recipes/new')}>
            {t('recipes.create', 'New Recipe')}
          </Button>
          <Button variant="secondary" fullWidth icon={<CreditCard className="h-4 w-4" />} onClick={() => navigate('/payments')}>
            {t('payments.logPayment', 'Log Payment')}
          </Button>
        </Card>
      </Section>
    </Page>
  );
}
