import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, CreditCard } from 'lucide-react';
import { Page, PageHeader, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, StatusBadge, EmptyState, type Column } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { Modal } from '@/components/Modal';
import { NumberInput, Select, DatePicker, TextInput } from '@/components/FormFields';
import { usePayments, useCreatePayment, useOrders } from '@/api/hooks';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { data: payments, isLoading } = usePayments();
  const { data: orders } = useOrders();
  const createPayment = useCreatePayment();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ orderId: '', amount: '' as number | '', method: 'cash', date: '', notes: '' });

  const orderOptions = ((orders as any[]) ?? []).map((o: any) => ({
    value: o.id,
    label: `#${o.orderNumber ?? o.id} - ${o.customerName ?? 'Customer'}`,
  }));

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'date', header: t('payments.date', 'Date'), sortable: true },
      { key: 'orderNumber', header: t('payments.order', 'Order'), render: (row: any) => `#${row.orderNumber ?? row.orderId}` },
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
    ],
    [t]
  );

  const handleCreate = useCallback(() => {
    createPayment.mutate(form, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ orderId: '', amount: '', method: 'cash', date: '', notes: '' });
      },
    });
  }, [form, createPayment]);

  if (isLoading) return <PageLoading />;

  const list = (payments as any[]) ?? [];

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

      {list.length === 0 ? (
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
        <DataTable
          columns={columns}
          data={list}
          keyExtractor={(row: any) => row.id}
          searchable
        />
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
          <Select
            label={t('payments.order', 'Order')}
            options={orderOptions}
            placeholder={t('payments.selectOrder', 'Select order...')}
            value={form.orderId}
            onChange={(e) => setForm({ ...form, orderId: e.target.value })}
            required
          />
          <NumberInput label={t('payments.amount', 'Amount (₪)')} value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} min={0} required />
          <Select
            label={t('payments.method', 'Method')}
            options={[
              { value: 'cash', label: t('payments.cash', 'Cash') },
              { value: 'credit_card', label: t('payments.card', 'Credit Card') },
              { value: 'bank_transfer', label: t('payments.bankTransfer', 'Bank Transfer') },
            ]}
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
          />
          <DatePicker label={t('payments.date', 'Date')} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <TextInput label={t('payments.notes', 'Notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} dir="auto" />
        </Stack>
      </Modal>
    </Page>
  );
}
