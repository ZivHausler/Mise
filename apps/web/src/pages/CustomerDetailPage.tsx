import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Page, Card, Section, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { ConfirmModal } from '@/components/Modal';
import { useCustomer, useCustomerOrders, useCustomerPayments, useDeleteCustomer } from '@/api/hooks';
import { getStatusLabel } from '@/utils/orderStatus';
import { useFormatDate } from '@/utils/dateFormat';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id!);
  const [ordersPage, setOrdersPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const { data: customerOrders } = useCustomerOrders(id!, ordersPage);
  const { data: customerPayments } = useCustomerPayments(id!, paymentsPage);
  const deleteCustomer = useDeleteCustomer();
  const formatDate = useFormatDate();
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');

  const c = customer as any;
  const ordersData = customerOrders as any;
  const orders = (ordersData?.orders as any[]) ?? [];
  const ordersPagination = ordersData?.pagination;

  const paymentsData = customerPayments as any;
  const payments = (paymentsData?.payments as any[]) ?? [];
  const paymentsPagination = paymentsData?.pagination;

  if (isLoading) return <PageLoading />;
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
        </div>

        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b bg-neutral-50">
                  <th className="px-3 py-2 text-start font-semibold">#</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('orders.dueDate', 'Date')}</th>
                  <th className="px-3 py-2 text-center font-semibold">{t('orders.statusLabel', 'Status')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('orders.total', 'Total')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => {
                  const label = getStatusLabel(o.status);
                  return (
                    <tr
                      key={o.id}
                      className="cursor-pointer border-b border-neutral-100 hover:bg-primary-50"
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <td className="px-3 py-2">#{o.orderNumber}</td>
                      <td className="px-3 py-2">{formatDate(o.dueDate ?? o.createdAt)}</td>
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
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b bg-neutral-50">
                  <th className="px-3 py-2 text-start font-semibold">{t('payments.date', 'Date')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('payments.order', 'Order')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('payments.amount', 'Amount')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('payments.method', 'Method')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-neutral-100">
                    <td className="px-3 py-2">{formatDate(p.createdAt)}</td>
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
      </Card>

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

const InfoRow = React.memo(function InfoRow({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex justify-between text-body-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800" dir={dir}>{value}</span>
    </div>
  );
});
