import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { NumberInput, Select, DatePicker, TextInput } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Stack } from '@/components/Layout';
import { useOrders, useCreatePayment, useCurrentStore, useCreateInvoice, downloadPdf } from '@/api/hooks';
import { useAppStore } from '@/store/app';
import { useToastStore } from '@/store/toast';
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
  const { data: currentStore } = useCurrentStore();
  const createInvoice = useCreateInvoice();
  const language = useAppStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const [form, setForm] = useState({ orderId: '', amount: '' as number | '', method: DEFAULT_PAYMENT_METHOD as string, date: '', notes: '' });
  const [generateInvoice, setGenerateInvoice] = useState(true);

  const hasTaxNumber = !!currentStore?.taxNumber;
  const autoInvoice = hasTaxNumber && !!currentStore?.autoGenerateInvoice;

  const orderList = (orders as any[]) ?? [];
  const orderOptions = orderList.map((o: any) => ({
    value: o.id,
    label: `#${o.orderNumber} - ${o.customer?.name ?? 'Customer'}`,
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
      setGenerateInvoice(true);
    }
  }, [open]);

  const handleCreate = useCallback(async () => {
    createPayment.mutate(form, {
      onSuccess: async () => {
        const shouldCreateInvoice = autoInvoice || (hasTaxNumber && !autoInvoice && generateInvoice);
        if (shouldCreateInvoice && form.orderId) {
          try {
            const today = new Date().toISOString().slice(0, 10);
            const inv = await createInvoice.mutateAsync({
              orderId: Number(form.orderId),
              notes: undefined,
              invoiceDate: form.date || today,
            });
            downloadPdf(`/invoices/${inv.id}/pdf?lang=${language}`, `invoice-${inv.displayNumber}.pdf`);
          } catch {
            addToast('warning', t('toasts.invoiceCreateFailed', 'Failed to create invoice'));
          }
        }
        onClose();
      },
    });
  }, [form, createPayment, onClose, autoInvoice, hasTaxNumber, generateInvoice, createInvoice, language, addToast, t]);

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

        {autoInvoice && (
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <p className="text-body-sm text-blue-800">
              {t('payments.autoInvoiceNotice', 'An invoice will be generated automatically.')}
            </p>
          </div>
        )}

        {hasTaxNumber && !autoInvoice && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateInvoice}
                onChange={(e) => setGenerateInvoice(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-body-sm text-amber-800">
                {t('payments.alsoGenerateInvoice', 'Also generate an invoice for this payment')}
              </span>
            </label>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
