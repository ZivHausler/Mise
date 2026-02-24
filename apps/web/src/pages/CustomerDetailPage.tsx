import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Page, Card, Section, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/DataDisplay';
import { PageSkeleton } from '@/components/Feedback';
import { ConfirmModal } from '@/components/Modal';
import { useCustomer, useCustomerOrders, useCustomerPayments, useDeleteCustomer, useCustomerLoyalty, useCustomerLoyaltyTransactions, useLoyaltyConfig } from '@/api/hooks';
import { getStatusLabel, STATUS_LABELS } from '@/utils/orderStatus';
import { useFormatDate } from '@/utils/dateFormat';
import AdjustPointsModal from '@/components/loyalty/AdjustPointsModal';
import RedeemPointsModal from '@/components/loyalty/RedeemPointsModal';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numId = id ? Number(id) : 0;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(numId);
  const [ordersPage, setOrdersPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);

  // Order filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<number | undefined>(undefined);
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');

  // Order sorting
  const [orderSortBy, setOrderSortBy] = useState<'created_at' | 'order_number'>('created_at');
  const [orderSortDir, setOrderSortDir] = useState<'asc' | 'desc'>('desc');

  // Payment filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | undefined>(undefined);
  const [paymentDateFrom, setPaymentDateFrom] = useState('');
  const [paymentDateTo, setPaymentDateTo] = useState('');

  const orderFilters = {
    ...(orderStatusFilter !== undefined && { status: orderStatusFilter }),
    ...(orderDateFrom && { dateFrom: orderDateFrom }),
    ...(orderDateTo && { dateTo: orderDateTo }),
  };
  const paymentFilters = {
    ...(paymentMethodFilter && { method: paymentMethodFilter }),
    ...(paymentDateFrom && { dateFrom: paymentDateFrom }),
    ...(paymentDateTo && { dateTo: paymentDateTo }),
  };

  const { data: customerOrders } = useCustomerOrders(numId, ordersPage, 10, Object.keys(orderFilters).length ? orderFilters : undefined, orderSortBy, orderSortDir);
  const { data: customerPayments } = useCustomerPayments(numId, paymentsPage, 10, Object.keys(paymentFilters).length ? paymentFilters : undefined);
  const deleteCustomer = useDeleteCustomer();
  const formatDate = useFormatDate();
  const [loyaltyPage, setLoyaltyPage] = useState(1);
  const { data: loyaltySummary } = useCustomerLoyalty(numId);
  const { data: loyaltyTxData } = useCustomerLoyaltyTransactions(numId, loyaltyPage, 10);
  const { data: rawLoyaltyConfig } = useLoyaltyConfig();
  const loyaltyConfig = rawLoyaltyConfig as { isActive: boolean; pointValue: number } | undefined;
  const [showDelete, setShowDelete] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments' | 'loyalty'>('orders');

  const c = customer as any;
  const ordersData = customerOrders as any;
  const orders = (ordersData?.orders as any[]) ?? [];
  const ordersPagination = ordersData?.pagination;

  const paymentsData = customerPayments as any;
  const payments = (paymentsData?.payments as any[]) ?? [];
  const paymentsPagination = paymentsData?.pagination;

  if (isLoading) return <PageSkeleton />;
  if (!c) return null;

  return (
    <Page>
      <Breadcrumbs items={[{ label: t('nav.customers'), path: '/customers' }, { label: c.name }]} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-h1 text-neutral-800">{c.name}</h1>
        <Row gap={2}>
          <Button variant="secondary" icon={<Edit className="h-4 w-4" />} onClick={() => navigate(`/customers/${c.id}/edit`)}>
            {t('common.edit')}
          </Button>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowDelete(true)}>
            {t('common.delete')}
          </Button>
        </Row>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Section title={t('customers.contactInfo', 'Contact Info')}>
            <Stack gap={2}>
              {c.phone && <InfoRow label={t('customers.phone', 'Phone')} value={c.phone} dir="ltr" />}
              {c.email && <InfoRow label={t('customers.email', 'Email')} value={c.email} dir="ltr" />}
              {c.address && <InfoRow label={t('customers.address', 'Address')} value={c.address} />}
            </Stack>
          </Section>
        </Card>

        <Card>
          <Section title={t('customers.preferences', 'Preferences & Notes')}>
            <Stack gap={2}>
              {c.allergies && <InfoRow label={t('customers.allergies', 'Allergies')} value={c.allergies} />}
              {c.notes && <InfoRow label={t('customers.notes', 'Notes')} value={c.notes} />}
            </Stack>
            {!c.allergies && !c.notes && (
              <p className="text-body-sm text-neutral-400">{t('customers.noNotes', 'No notes or preferences.')}</p>
            )}
          </Section>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex gap-1 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-body-sm font-medium ${activeTab === 'orders' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500'}`}
          >
            {t('customers.orderHistory', 'Order History')}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2.5 text-body-sm font-medium ${activeTab === 'payments' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500'}`}
          >
            {t('nav.payments')}
          </button>
          {loyaltyConfig?.isActive && (
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`px-4 py-2.5 text-body-sm font-medium ${activeTab === 'loyalty' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500'}`}
            >
              {t('customers.loyalty', 'Loyalty')}
            </button>
          )}
        </div>

        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <div className="mb-3 mt-1 flex flex-wrap items-end gap-4 px-1">
              <label className="flex flex-col gap-1">
                <span className="text-body-sm font-semibold text-neutral-700">{t('common.from')}</span>
                <input
                  type="date"
                  className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700"
                  value={orderDateFrom}
                  onChange={(e) => { setOrderDateFrom(e.target.value); setOrdersPage(1); }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-body-sm font-semibold text-neutral-700">{t('common.to')}</span>
                <input
                  type="date"
                  className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700"
                  value={orderDateTo}
                  onChange={(e) => { setOrderDateTo(e.target.value); setOrdersPage(1); }}
                />
              </label>
              <select
                className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700"
                value={orderStatusFilter ?? ''}
                onChange={(e) => { setOrderStatusFilter(e.target.value === '' ? undefined : Number(e.target.value)); setOrdersPage(1); }}
              >
                <option value="">{t('common.allStatuses', 'All statuses')}</option>
                {STATUS_LABELS.map((label, idx) => (
                  <option key={idx} value={idx}>{t(`orders.status.${label}`, label)}</option>
                ))}
              </select>
              {(orderStatusFilter !== undefined || orderDateFrom || orderDateTo) && (
                <button
                  className="text-body-sm text-primary-600 hover:text-primary-700"
                  onClick={() => { setOrderStatusFilter(undefined); setOrderDateFrom(''); setOrderDateTo(''); setOrdersPage(1); }}
                >
                  {t('common.clearFilters', 'Clear')}
                </button>
              )}
            </div>
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b bg-neutral-50">
                  <th
                    className="sticky start-0 z-10 cursor-pointer select-none bg-neutral-50 px-3 py-2 text-start font-semibold"
                    onClick={() => {
                      if (orderSortBy === 'created_at') {
                        setOrderSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setOrderSortBy('created_at');
                        setOrderSortDir('desc');
                      }
                      setOrdersPage(1);
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {t('orders.dueDate', 'Date')}
                      {orderSortBy === 'created_at' && (orderSortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                    </span>
                  </th>
                  <th
                    className="cursor-pointer select-none px-3 py-2 text-start font-semibold"
                    onClick={() => {
                      if (orderSortBy === 'order_number') {
                        setOrderSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setOrderSortBy('order_number');
                        setOrderSortDir('asc');
                      }
                      setOrdersPage(1);
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {t('orders.orderNumber', 'Order Number')}
                      {orderSortBy === 'order_number' && (orderSortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                    </span>
                  </th>
                  <th className="px-3 py-2 text-center font-semibold">{t('orders.statusLabel', 'Status')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('orders.total', 'Total')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => {
                  const label = getStatusLabel(o.status);
                  return (
                    <tr
                      key={String(o.id)}
                      className="group cursor-pointer border-b border-neutral-100 hover:bg-primary-50"
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <td className="sticky start-0 z-10 bg-white px-3 py-2 group-hover:bg-primary-50">{formatDate(o.dueDate ?? o.createdAt)}</td>
                      <td className="px-3 py-2">#{o.orderNumber}</td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge variant={label} label={t(`orders.status.${label}`, label)} />
                      </td>
                      <td className="px-3 py-2 text-end font-mono">{o.totalAmount} {t('common.currency')}</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-neutral-400">
                      {t('customers.noOrders', 'No orders yet.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {ordersPagination && ordersPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
                <span className="text-body-sm text-neutral-500">
                  {t('common.showingOf', '{{from}}-{{to}} of {{total}}', {
                    from: (ordersPagination.page - 1) * ordersPagination.limit + 1,
                    to: Math.min(ordersPagination.page * ordersPagination.limit, ordersPagination.total),
                    total: ordersPagination.total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setOrdersPage((p) => p - 1)}
                    disabled={ordersPagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                  </Button>
                  <span className="text-body-sm text-neutral-700">
                    {ordersPagination.page} / {ordersPagination.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setOrdersPage((p) => p + 1)}
                    disabled={ordersPagination.page >= ordersPagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <div className="mb-3 mt-1 flex flex-wrap items-end gap-4 px-1">
              <label className="flex flex-col gap-1">
                <span className="text-body-sm font-semibold text-neutral-700">{t('common.from')}</span>
                <input
                  type="date"
                  className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700"
                  value={paymentDateFrom}
                  onChange={(e) => { setPaymentDateFrom(e.target.value); setPaymentsPage(1); }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-body-sm font-semibold text-neutral-700">{t('common.to')}</span>
                <input
                  type="date"
                  className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700"
                  value={paymentDateTo}
                  onChange={(e) => { setPaymentDateTo(e.target.value); setPaymentsPage(1); }}
                />
              </label>
              <select
                className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700"
                value={paymentMethodFilter ?? ''}
                onChange={(e) => { setPaymentMethodFilter(e.target.value || undefined); setPaymentsPage(1); }}
              >
                <option value="">{t('payments.allMethods', 'All methods')}</option>
                <option value="cash">{t('payments.cash', 'Cash')}</option>
              </select>
              {(paymentMethodFilter || paymentDateFrom || paymentDateTo) && (
                <button
                  className="text-body-sm text-primary-600 hover:text-primary-700"
                  onClick={() => { setPaymentMethodFilter(undefined); setPaymentDateFrom(''); setPaymentDateTo(''); setPaymentsPage(1); }}
                >
                  {t('common.clearFilters', 'Clear')}
                </button>
              )}
            </div>
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b bg-neutral-50">
                  <th className="sticky start-0 z-10 bg-neutral-50 px-3 py-2 text-start font-semibold">{t('payments.date', 'Date')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('orders.orderNumber', 'Order Number')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('payments.amount', 'Amount')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('payments.method', 'Method')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={String(p.id)} className="group border-b border-neutral-100">
                    <td className="sticky start-0 z-10 bg-white px-3 py-2">{formatDate(p.createdAt)}</td>
                    <td className="px-3 py-2">#{p.orderNumber}</td>
                    <td className="px-3 py-2 text-end font-mono">{p.amount} {t('common.currency')}</td>
                    <td className="px-3 py-2">
                      <StatusBadge variant="info" label={p.method === 'cash' ? t('payments.cash', 'Cash') : t('payments.card', 'Card')} />
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-neutral-400">
                      {t('customers.noPayments', 'No payments yet.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {paymentsPagination && paymentsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
                <span className="text-body-sm text-neutral-500">
                  {t('common.showingOf', '{{from}}-{{to}} of {{total}}', {
                    from: (paymentsPagination.page - 1) * paymentsPagination.limit + 1,
                    to: Math.min(paymentsPagination.page * paymentsPagination.limit, paymentsPagination.total),
                    total: paymentsPagination.total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPaymentsPage((p) => p - 1)}
                    disabled={paymentsPagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                  </Button>
                  <span className="text-body-sm text-neutral-700">
                    {paymentsPagination.page} / {paymentsPagination.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPaymentsPage((p) => p + 1)}
                    disabled={paymentsPagination.page >= paymentsPagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'loyalty' && (
          <div>
            {/* Summary cards */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-primary-50 p-3 text-center">
                <div className="text-h2 font-bold text-primary-700">{(loyaltySummary as any)?.balance ?? 0}</div>
                <div className="text-body-sm text-primary-600">{t('loyalty.balance')}</div>
                {loyaltyConfig?.pointValue && (
                  <div className="text-body-sm text-primary-400">
                    {t('loyalty.shekelEquivalent', { value: (((loyaltySummary as any)?.balance ?? 0) * loyaltyConfig.pointValue).toFixed(2) })}
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-neutral-50 p-3 text-center">
                <div className="text-h2 font-bold text-neutral-700">{(loyaltySummary as any)?.lifetimeEarned ?? 0}</div>
                <div className="text-body-sm text-neutral-500">{t('loyalty.lifetimeEarned')}</div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3 text-center">
                <div className="text-h2 font-bold text-neutral-700">{(loyaltySummary as any)?.lifetimeRedeemed ?? 0}</div>
                <div className="text-body-sm text-neutral-500">{t('loyalty.lifetimeRedeemed')}</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mb-4 flex justify-center gap-2 sm:justify-start">
              <Button size="sm" variant="secondary" onClick={() => setShowAdjust(true)}>
                {t('loyalty.adjustPoints')}
              </Button>
              <Button size="sm" variant="primary" onClick={() => setShowRedeem(true)} disabled={!((loyaltySummary as any)?.balance > 0)}>
                {t('loyalty.redeemPoints')}
              </Button>
            </div>

            {/* Transaction history */}
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b bg-neutral-50">
                    <th className="sticky start-0 z-10 bg-neutral-50 px-3 py-2 text-start font-semibold">{t('payments.date', 'Date')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('loyalty.type')}</th>
                    <th className="px-3 py-2 text-end font-semibold">{t('loyalty.points')}</th>
                    <th className="px-3 py-2 text-end font-semibold">{t('loyalty.balanceAfter')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('loyalty.description')}</th>
                  </tr>
                </thead>
                <tbody>
                  {((loyaltyTxData as any)?.transactions ?? []).map((tx: any) => (
                    <tr key={String(tx.id)} className="border-b border-neutral-100">
                      <td className="sticky start-0 z-10 bg-white px-3 py-2">{formatDate(tx.createdAt)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          variant={tx.type === 'earned' ? 'ready' : tx.type === 'redeemed' ? 'delivered' : 'info'}
                          label={t(`loyalty.types.${tx.type}`, tx.type)}
                        />
                      </td>
                      <td className={`px-3 py-2 text-end font-mono ${tx.points > 0 ? 'text-success-dark' : 'text-error'}`}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points}
                      </td>
                      <td className="px-3 py-2 text-end font-mono">{tx.balanceAfter}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatLoyaltyDescription(tx.description, t) || '—'}</td>
                    </tr>
                  ))}
                  {((loyaltyTxData as any)?.transactions ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-neutral-400">
                        {t('loyalty.noTransactions')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {(loyaltyTxData as any)?.pagination && (loyaltyTxData as any).pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
                <span className="text-body-sm text-neutral-500">
                  {t('common.showingOf', '{{from}}-{{to}} of {{total}}', {
                    from: ((loyaltyTxData as any).pagination.page - 1) * (loyaltyTxData as any).pagination.limit + 1,
                    to: Math.min((loyaltyTxData as any).pagination.page * (loyaltyTxData as any).pagination.limit, (loyaltyTxData as any).pagination.total),
                    total: (loyaltyTxData as any).pagination.total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setLoyaltyPage((p) => p - 1)}
                    disabled={(loyaltyTxData as any).pagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                  </Button>
                  <span className="text-body-sm text-neutral-700">
                    {(loyaltyTxData as any).pagination.page} / {(loyaltyTxData as any).pagination.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setLoyaltyPage((p) => p + 1)}
                    disabled={(loyaltyTxData as any).pagination.page >= (loyaltyTxData as any).pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <AdjustPointsModal
        open={showAdjust}
        onClose={() => setShowAdjust(false)}
        customerId={c.id}
        currentBalance={(loyaltySummary as any)?.balance ?? 0}
      />
      <RedeemPointsModal
        open={showRedeem}
        onClose={() => setShowRedeem(false)}
        customerId={c.id}
        currentBalance={(loyaltySummary as any)?.balance ?? 0}
      />

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteCustomer.mutate(c.id, { onSuccess: () => navigate('/customers') })}
        title={t('customers.deleteTitle', 'Delete Customer?')}
        message={t('customers.deleteMsg', 'This will permanently remove the customer.')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        loading={deleteCustomer.isPending}
      />
    </Page>
  );
}

function formatLoyaltyDescription(desc: string | null, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!desc) return '';
  if (desc.startsWith('redeemed:')) {
    const [, points, value] = desc.split(':');
    return t('loyalty.descriptions.redeemed', { points, value });
  }
  const key = `loyalty.descriptions.${desc}`;
  const translated = t(key);
  return translated !== key ? translated : desc;
}

const InfoRow = React.memo(function InfoRow({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex justify-between text-body-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800" dir={dir}>{value}</span>
    </div>
  );
});
