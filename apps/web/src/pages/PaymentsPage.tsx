import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, CreditCard, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Page, PageHeader, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, StatusBadge, EmptyState, type Column } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { Modal } from '@/components/Modal';
import { NumberInput, Select, DatePicker, TextInput } from '@/components/FormFields';
import { usePayments, useCreatePayment, useRefundPayment, useOrders } from '@/api/hooks';
import { PAYMENT_METHODS, DEFAULT_PAYMENT_METHOD, PAYMENT_METHOD_I18N } from '@/constants/defaults';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data: paymentsData, isLoading } = usePayments(page);
  const { data: orders } = useOrders();
  const createPayment = useCreatePayment();
  const refundPayment = useRefundPayment();
  const [showAdd, setShowAdd] = useState(false);
  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [form, setForm] = useState({ orderId: '', amount: '' as number | '', method: DEFAULT_PAYMENT_METHOD as string, date: '', notes: '' });

  const paymentsResult = paymentsData as any;
  const list = (paymentsResult?.payments as any[]) ?? [];
  const pagination = paymentsResult?.pagination;

  const orderOptions = ((orders as any[]) ?? []).map((o: any) => ({
    value: o.id,
    label: `#${o.orderNumber} - ${o.customerName ?? 'Customer'}`,
  }));

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'createdAt', header: t('payments.date', 'Date'), sortable: true, render: (row: any) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-' },
      { key: 'orderNumber', header: t('payments.order', 'Order'), render: (row: any) => `#${row.orderNumber}` },
      { key: 'customerName', header: t('payments.customer', 'Customer'), sortable: true },
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
      {
        key: 'actions',
        header: '',
        shrink: true,
        render: (row: any) => row.status !== 'refunded' ? (
          <Button
            size="sm"
            variant="secondary"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={(e) => { e.stopPropagation(); setRefundTarget(row); }}
          >
            {t('payments.refund', 'Refund')}
          </Button>
        ) : null,
      },
    ],
    [t]
  );

  const handleRefund = useCallback(() => {
    if (!refundTarget) return;
    refundPayment.mutate(refundTarget.id, {
      onSuccess: () => setRefundTarget(null),
    });
  }, [refundTarget, refundPayment]);

  const handleCreate = useCallback(() => {
    createPayment.mutate(form, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ orderId: '', amount: '', method: DEFAULT_PAYMENT_METHOD, date: '', notes: '' });
      },
    });
  }, [form, createPayment]);

  if (isLoading) return <PageLoading />;

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

      {list.length === 0 && (!pagination || pagination.total === 0) ? (
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
        <div>
          <DataTable
            columns={columns}
            data={list}
            keyExtractor={(row: any) => row.id}
            searchable
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('payments.logPayment', 'Log Payment')} size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate} loading={createPayment.isPending}>{t('payments.logPayment', 'Log Payment')}</Button>
          </>
        }
      >
        <Stack gap={4}>
          <div className="flex gap-3">
            <Select
              label={t('payments.order', 'Order')}
              options={orderOptions}
              placeholder={t('payments.selectOrder', 'Select order...')}
              value={form.orderId}
              onChange={(e) => {
                const orderId = e.target.value;
                const order = ((orders as any[]) ?? []).find((o: any) => o.id === orderId);
                setForm({ ...form, orderId, amount: order?.totalAmount ?? '' });
              }}
              required
              className="flex-1"
            />
            <NumberInput label={t('payments.amount', 'Amount (₪)')} value={form.amount} onChange={() => {}} min={0} required disabled className="w-20 sm:w-28" />
          </div>
          <Select
            label={t('payments.method', 'Method')}
            options={PAYMENT_METHODS.map((m) => ({
              value: m,
              label: t(`payments.${PAYMENT_METHOD_I18N[m]}`, m),
            }))}
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
          />
          <DatePicker label={t('payments.date', 'Date')} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <TextInput label={t('payments.notes', 'Notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} dir="auto" />
        </Stack>
      </Modal>

      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title={t('payments.refundTitle', 'Refund Payment?')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefundTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleRefund} loading={refundPayment.isPending}>{t('payments.refund', 'Refund')}</Button>
          </>
        }
      >
        <p className="text-body-sm text-neutral-600">
          {t('payments.refundMsg', 'This will mark the payment of {{amount}} {{currency}} for order #{{order}} as refunded.', {
            amount: refundTarget?.amount,
            currency: t('common.currency'),
            order: refundTarget?.orderNumber,
          })}
        </p>
      </Modal>
    </Page>
  );
}
