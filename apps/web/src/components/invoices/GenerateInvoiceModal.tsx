import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useCreateInvoice, useCreateCreditNote, useRefundPayment, useCurrentStore, downloadPdf } from '@/api/hooks';
import { useAppStore } from '@/store/app';
import { useToastStore } from '@/store/toast';

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: { id: number; orderNumber: number; customerName: string; totalAmount: number };
  type: 'invoice' | 'credit_note';
  originalInvoiceId?: number;
  isPaid?: boolean;
  payments?: any[];
}

export function GenerateInvoiceModal({ isOpen, onClose, order, type, originalInvoiceId, isPaid, payments }: GenerateInvoiceModalProps) {
  const { t } = useTranslation();
  const language = useAppStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);
  const { data: currentStore } = useCurrentStore();
  const hasTaxNumber = !!currentStore?.taxNumber;

  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [alsoRefund, setAlsoRefund] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createInvoice = useCreateInvoice();
  const createCreditNote = useCreateCreditNote(originalInvoiceId ?? -1);
  const refundPayment = useRefundPayment();

  const isCredit = type === 'credit_note';
  const showRefundToggle = isCredit && !!isPaid && (payments ?? []).some((p: any) => p.status !== 'refunded');

  const title = isCredit
    ? t('invoices.generateCreditNote', 'Generate Credit Note')
    : t('invoices.generate', 'Generate Invoice');

  const handleGenerate = useCallback(async () => {
    setIsSubmitting(true);

    const onInvoiceSuccess = async (data: any) => {
      const displayNumber = data?.displayNumber ?? data?.invoiceNumber ?? '';
      const id = data?.id;
      if (id) {
        downloadPdf(`/invoices/${id}/pdf?lang=${language}`, `invoice-${displayNumber}.pdf`);
      }
    };

    try {
      if (isCredit && originalInvoiceId) {
        const data = await createCreditNote.mutateAsync({ notes: notes || undefined });
        await onInvoiceSuccess(data);
      } else {
        const data = await createInvoice.mutateAsync({ orderId: order.id, notes: notes || undefined, invoiceDate });
        await onInvoiceSuccess(data);
      }
    } catch {
      setIsSubmitting(false);
      return;
    }

    // If refund toggle is on, refund all non-refunded payments
    if (showRefundToggle && alsoRefund) {
      const nonRefundedPayments = (payments ?? []).filter((p: any) => p.status !== 'refunded');
      try {
        for (const payment of nonRefundedPayments) {
          await refundPayment.mutateAsync(payment.id);
        }
      } catch {
        addToast('warning', t('refund.creditNoteFailed', 'Credit note created but refund failed. You can refund manually.'));
      }
    }

    setIsSubmitting(false);
    setNotes('');
    setAlsoRefund(true);
    onClose();
  }, [isCredit, originalInvoiceId, createCreditNote, createInvoice, refundPayment, order.id, notes, invoiceDate, language, onClose, showRefundToggle, alsoRefund, payments, addToast, t]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const isPending = isSubmitting;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>{t('common.cancel')}</Button>
          <Button
            variant={showRefundToggle && alsoRefund ? 'danger' : 'primary'}
            onClick={handleGenerate}
            loading={isPending}
            disabled={!hasTaxNumber}
          >
            {showRefundToggle && alsoRefund
              ? t('refund.refundAndCreditNote', 'Refund & Credit Note')
              : title}
          </Button>
        </>
      }
    >
      <Stack gap={4}>
        {!hasTaxNumber && (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-body-sm text-amber-800">
              {t('invoices.missingBusinessDetailsBefore', 'Complete your business details in')}
              {' '}
              <Link
                to="/settings"
                onClick={onClose}
                className="font-medium text-amber-700 underline hover:text-amber-900"
              >
                {t('invoices.missingBusinessDetailsLink', 'Settings > Billing')}
              </Link>
              {' '}
              {t('invoices.missingBusinessDetailsAfter', 'before generating invoices.')}
            </p>
          </div>
        )}

        <div className="space-y-2 text-body-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('invoices.order', 'Order')}</span>
            <span className="font-medium text-neutral-800">#{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('invoices.customer', 'Customer')}</span>
            <span className="font-medium text-neutral-800">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('invoices.amount', 'Amount')}</span>
            <span className="font-medium text-neutral-800">{order.totalAmount} {t('common.currency')}</span>
          </div>
        </div>

        {!isCredit && (
          <TextInput
            label={t('invoices.invoiceDate', 'Invoice Date')}
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        )}

        <TextInput
          label={t('invoices.notes', 'Notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder=""
        />

        {showRefundToggle && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoRefund}
              onChange={(e) => setAlsoRefund(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-body-sm text-neutral-700">
              {t('refund.alsoRefund', 'Also refund the payment')}
            </span>
          </label>
        )}
      </Stack>
    </Modal>
  );
}
