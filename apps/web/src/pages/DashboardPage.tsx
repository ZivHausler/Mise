import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Clock, AlertTriangle, Coins, Plus, BookOpen, CreditCard, ChevronDown, ChevronUp, BadgeDollarSign, ShoppingBasket, Ban } from 'lucide-react';
import { Page, PageHeader, Section, Card } from '@/components/Layout';
import { StatCard, StatusBadge } from '@/components/DataDisplay';
import { Button } from '@/components/Button';
import { PageLoading } from '@/components/Feedback';
import { useDashboardStats, useOrders, usePaymentStatuses, useLoyaltyDashboard, useFeatureFlags, useRecipes, useInventory } from '@/api/hooks';
import { ORDER_STATUS, getStatusLabel } from '@/utils/orderStatus';
import { useFormatDate } from '@/utils/dateFormat';
import BirthdayWidget from '@/components/dashboard/BirthdayWidget';
import ReengagementWidget from '@/components/dashboard/ReengagementWidget';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: paymentStatuses } = usePaymentStatuses();
  const { data: featureFlags } = useFeatureFlags();
  const dashboardUnlocked = featureFlags?.dashboard !== false; // undefined = legacy = unlocked
  const loyaltyEnabled = featureFlags?.loyalty && featureFlags?.loyaltyEnhancements;
  const { data: loyaltyDashboard } = useLoyaltyDashboard(!!loyaltyEnabled);
  const loyaltyData = loyaltyDashboard as any;

  // Free-tier data: inventory + recipes
  const { data: inventoryData } = useInventory(1, 999);
  const { data: recipesData } = useRecipes();
  const inventoryItems = (inventoryData as any)?.items ?? [];
  const recipesList = (recipesData as any[]) ?? [];

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

  const outOfStockCount = useMemo(() => inventoryItems.filter((i: any) => i.quantity <= 0).length, [inventoryItems]);
  const totalInventoryValue = useMemo(() => inventoryItems.reduce((sum: number, i: any) => sum + (i.quantity * i.costPerUnit), 0), [inventoryItems]);

  if (statsLoading || ordersLoading) return <PageLoading />;

  const statCards = dashboardUnlocked
    ? [
        { label: t('dashboard.todaysOrders', "Today's Orders"), value: todayOrders, icon: <Package className="h-6 w-6" /> },
        { label: t('dashboard.pendingOrders', 'Pending Orders'), value: pendingOrders, icon: <Clock className="h-6 w-6" /> },
        { label: t('dashboard.lowStock', 'Low Stock'), value: dashStats?.lowStockItems ?? 0, icon: <AlertTriangle className="h-6 w-6" />, onClick: () => navigate('/inventory?status=low,out') },
        { label: t('dashboard.todaysRevenue', "Today's Revenue"), value: `${dashStats?.todayRevenue ?? 0} ${t('common.currency', '₪')}`, icon: <Coins className="h-6 w-6" /> },
      ]
    : [
        { label: t('dashboard.totalIngredients', 'Ingredients'), value: inventoryItems.length, icon: <ShoppingBasket className="h-6 w-6" />, onClick: () => navigate('/inventory') },
        { label: t('dashboard.totalRecipes', 'Recipes'), value: recipesList.length, icon: <BookOpen className="h-6 w-6" />, onClick: () => navigate('/recipes') },
        { label: t('dashboard.lowStock', 'Low Stock'), value: dashStats?.lowStockItems ?? 0, icon: <AlertTriangle className="h-6 w-6" />, onClick: () => navigate('/inventory?status=low,out') },
        { label: t('dashboard.outOfStock', 'Out of Stock'), value: outOfStockCount, icon: <Ban className="h-6 w-6" />, onClick: () => navigate('/inventory?status=out') },
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

      {loyaltyEnabled && dashboardUnlocked && (
        <div className="mb-6">
          <BirthdayWidget birthdays={loyaltyData?.upcomingBirthdays ?? []} />
        </div>
      )}

      {dashboardUnlocked ? (
        <Section title={t('dashboard.orderPipeline', 'Order Pipeline')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                      key={String(order.id)}
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
                      <p className="text-caption text-neutral-500">{order.customer?.name ?? 'Customer'}</p>
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
      ) : (
        /* Free tier: inventory & recipe overview */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Inventory value + low stock list */}
          <Section title={t('dashboard.inventoryOverview', 'Inventory Overview')}>
            <Card variant="flat" className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-body-sm text-neutral-500">{t('dashboard.inventoryValue', 'Inventory Value')}</span>
                <span className="font-heading text-h3 text-neutral-800">
                  {Math.round(totalInventoryValue)} {t('common.currency', '₪')}
                </span>
              </div>
              {(dashStats?.lowStockItems ?? 0) > 0 && (
                <>
                  <p className="text-body-sm font-medium text-amber-600 mb-2">
                    {t('dashboard.lowStockItems', '{{count}} items need restocking', { count: dashStats?.lowStockItems ?? 0 })}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {inventoryItems
                      .filter((i: any) => i.quantity <= i.lowStockThreshold && i.quantity > 0)
                      .slice(0, 5)
                      .map((i: any) => (
                        <div
                          key={i.id}
                          onClick={() => navigate(`/inventory`)}
                          className="flex items-center justify-between rounded-md border border-amber-100 bg-amber-50/50 px-3 py-1.5 text-body-sm cursor-pointer hover:bg-amber-50"
                        >
                          <span className="text-neutral-700">{i.name}</span>
                          <span className="text-amber-600 font-medium">{i.quantity} {i.unit}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
              {outOfStockCount > 0 && (
                <>
                  <p className="text-body-sm font-medium text-red-600 mb-2 mt-3">
                    {t('dashboard.outOfStockItems', '{{count}} items out of stock', { count: outOfStockCount })}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {inventoryItems
                      .filter((i: any) => i.quantity <= 0)
                      .slice(0, 5)
                      .map((i: any) => (
                        <div
                          key={i.id}
                          onClick={() => navigate(`/inventory`)}
                          className="flex items-center justify-between rounded-md border border-red-100 bg-red-50/50 px-3 py-1.5 text-body-sm cursor-pointer hover:bg-red-50"
                        >
                          <span className="text-neutral-700">{i.name}</span>
                          <span className="text-red-600 font-medium">{t('dashboard.outOfStock', 'Out of Stock')}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
              {(dashStats?.lowStockItems ?? 0) === 0 && outOfStockCount === 0 && (
                <p className="text-body-sm text-green-600">{t('dashboard.stockHealthy', 'All items are well stocked')}</p>
              )}
            </Card>
          </Section>

          {/* Recent recipes */}
          <Section title={t('dashboard.recentRecipes', 'Recent Recipes')}>
            <Card variant="flat" className="p-4">
              {recipesList.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <BookOpen className="h-8 w-8 text-neutral-300" />
                  <p className="text-body-sm text-neutral-500">{t('dashboard.noRecipesYet', 'No recipes yet')}</p>
                  <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/recipes/new')}>
                    {t('recipes.create', 'New Recipe')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recipesList.slice(0, 6).map((r: any) => (
                    <div
                      key={r._id ?? r.id}
                      onClick={() => navigate(`/recipes/${r._id ?? r.id}`)}
                      className="flex items-center justify-between rounded-md border border-neutral-100 px-3 py-2 text-body-sm cursor-pointer hover:bg-primary-50"
                    >
                      <span className="font-medium text-neutral-800">{r.name}</span>
                      {r.ingredients?.length != null && (
                        <span className="text-caption text-neutral-400">
                          {r.ingredients.length} {t('dashboard.ingredients', 'ingredients')}
                        </span>
                      )}
                    </div>
                  ))}
                  {recipesList.length > 6 && (
                    <button
                      onClick={() => navigate('/recipes')}
                      className="text-body-sm text-primary-500 hover:text-primary-600 font-medium mt-1"
                    >
                      {t('common.viewAll', { count: recipesList.length })}
                    </button>
                  )}
                </div>
              )}
            </Card>
          </Section>
        </div>
      )}

      {loyaltyEnabled && dashboardUnlocked && (
        <div className="mb-6">
          <ReengagementWidget customers={loyaltyData?.dormantCustomers ?? []} />
        </div>
      )}

      <Section title={t('dashboard.quickActions', 'Quick Actions')}>
        <Card variant="flat" className="flex flex-col gap-2 px-6 py-0 lg:flex-row">
          {dashboardUnlocked ? (
            <>
              <Button variant="primary" fullWidth icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/orders/new')}>
                {t('orders.create', 'New Order')}
              </Button>
              <Button variant="secondary" fullWidth icon={<CreditCard className="h-4 w-4" />} onClick={() => navigate('/payments')}>
                {t('payments.logPayment', 'Log Payment')}
              </Button>
            </>
          ) : null}
          <Button variant="secondary" fullWidth icon={<BookOpen className="h-4 w-4" />} onClick={() => navigate('/recipes/new')}>
            {t('recipes.create', 'New Recipe')}
          </Button>
        </Card>
      </Section>
    </Page>
  );
}
