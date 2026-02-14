import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Clock, AlertTriangle, Coins, Plus, BookOpen, CreditCard } from 'lucide-react';
import { Page, PageHeader, Section, Card, Row } from '@/components/Layout';
import { StatCard, StatusBadge } from '@/components/DataDisplay';
import { Button } from '@/components/Button';
import { PageLoading } from '@/components/Feedback';
import { useDashboardStats, useOrders } from '@/api/hooks';
import type { OrderStatus } from '@mise/shared';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: orders, isLoading: ordersLoading } = useOrders();

  const dashStats = stats as any;

  const ordersByStatus = useMemo(() => {
    if (!orders) return {} as Record<string, unknown[]>;
    const grouped: Record<string, unknown[]> = { received: [], in_progress: [], ready: [], delivered: [] };
    (orders as any[]).forEach((o) => {
      if (grouped[o.status]) grouped[o.status].push(o);
    });
    return grouped;
  }, [orders]);

  if (statsLoading || ordersLoading) return <PageLoading />;

  const statCards = [
    { label: t('dashboard.todaysOrders', "Today's Orders"), value: dashStats?.todayOrders ?? 0, icon: <Package className="h-6 w-6" /> },
    { label: t('dashboard.pendingOrders', 'Pending Orders'), value: dashStats?.pendingOrders ?? 0, icon: <Clock className="h-6 w-6" /> },
    { label: t('dashboard.lowStock', 'Low Stock'), value: dashStats?.lowStockItems ?? 0, icon: <AlertTriangle className="h-6 w-6" /> },
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
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>

      <Section title={t('dashboard.orderPipeline', 'Order Pipeline')}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(['received', 'in_progress', 'ready', 'delivered'] as OrderStatus[]).map((status) => (
            <div key={status} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <StatusBadge variant={status} label={statusLabels[status]} />
                <span className="text-caption font-medium text-neutral-500">
                  {ordersByStatus[status]?.length ?? 0}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {(ordersByStatus[status] ?? []).slice(0, 3).map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="cursor-pointer rounded-md border border-neutral-100 p-2 text-body-sm hover:bg-primary-50"
                  >
                    <p className="font-medium text-neutral-800">#{order.orderNumber ?? order.id}</p>
                    <p className="text-caption text-neutral-500">{order.customerName ?? 'Customer'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
