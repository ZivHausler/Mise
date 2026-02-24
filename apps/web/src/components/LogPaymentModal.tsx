import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/Modal';
import { NumberInput, Select, DatePicker, TextInput } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Stack } from '@/components/Layout';
import { useOrders, useCreatePayment } from '@/api/hooks';
import { PAYMENT_METHODS, DEFAULT_PAYMENT_METHOD, PAYMENT_METHOD_I18N } from '@/constants/defaults';

interface LogPaymentModalProps {
  open: boolean;
  onClose: () => void;
  preselectedOrderId?: number;
}

export function LogPaymentModal({ open, onClose, preselectedOrderId }: LogPaymentModalProps) {
  const { t } = useTranslation();
  const { data: orders } = useOrders({ excludePaid: true });
  const createPayment = useCreatePayment();
  const [form, setForm] = useState({ orderId: '', amount: '' as number | '', method: DEFAULT_PAYMENT_METHOD as string, date: '', notes: '' });

  const orderList = (orders as any[]) ?? [];
  const orderOptions = orderList.map((o: any) => ({
    value: o.id,
    label: `#${o.orderNumber} - ${o.customerName ?? 'Customer'}`,
  }));

  // Pre-select order when provided
  useEffect(() => {
    if (open && preselectedOrderId != null) {
      const order = orderList.find((o: any) => o.id === preselectedOrderId);
      if (order) {
        setForm((f) => ({ ...f, orderId: String(preselectedOrderId), amount: order.totalAmount ?? '' }));
      }
    }
  }, [open, preselectedOrderId, orderList]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setForm({ orderId: '', amount: '', method: DEFAULT_PAYMENT_METHOD, date: '', notes: '' });
    }
  }, [open]);

  const handleCreate = useCallback(() => {
    createPayment.mutate(form, {
      onSuccess: () => onClose(),
    });
  }, [form, createPayment, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('payments.logPayment', 'Log Payment')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleCreate} loading={createPayment.isPending} disabled={!form.orderId || !form.date}>{t('payments.logPayment', 'Log Payment')}</Button>
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
              const order = orderList.find((o: any) => String(o.id) === orderId);
              setForm({ ...form, orderId, amount: order?.totalAmount ?? '' });
            }}
            required
            className="flex-1"
            disabled={preselectedOrderId != null}
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
        <DatePicker label={t('payments.date', 'Date')} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <TextInput label={t('payments.notes', 'Notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} dir="auto" />
      </Stack>
    </Modal>
  );
}
