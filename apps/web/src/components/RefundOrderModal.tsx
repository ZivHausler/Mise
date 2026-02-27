import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useRefundPayment, useCreateCreditNote, useCurrentStore } from '@/api/hooks';
import { useToastStore } from '@/store/toast';

interface RefundOrderModalProps {
  open: boolean;
  onClose: () => void;
  order: {
    id: number;
    orderNumber: number;
    customerName: string;
    totalAmount: number;
  };
  invoice: any | null;
  creditNoteExists: boolean;
  payments: any[];
}

export function RefundOrderModal({ open, onClose, order, invoice, creditNoteExists, payments }: RefundOrderModalProps) {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const refundPayment = useRefundPayment();
  const createCreditNote = useCreateCreditNote(invoice?.id ?? -1);
  const { data: currentStore } = useCurrentStore();

  const [generateCreditNote, setGenerateCreditNote] = useState(true);
  const [creditNoteNotes, setCreditNoteNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasTaxNumber = !!currentStore?.taxNumber;
  const autoCreditNote = hasTaxNumber && !!currentStore?.autoGenerateCreditNote;
  const showCreditNoteToggle = !!invoice && !creditNoteExists && hasTaxNumber && !autoCreditNote;
  const shouldAutoGenerateCN = !!invoice && !creditNoteExists && autoCreditNote;

  const handleSubmit = useCallback(async () => {
    const nonRefundedPayments = payments.filter((p: any) => p.status !== 'refunded');
    setIsSubmitting(true);

    try {
      // Refund all non-refunded payments
      for (const payment of nonRefundedPayments) {
        await refundPayment.mutateAsync(payment.id);
      }
    } catch {
      // refundPayment hook already shows error toast
      setIsSubmitting(false);
      return;
    }

    // If credit note toggle is on and invoice exists
    if (showCreditNoteToggle && generateCreditNote && invoice?.id) {
      try {
        await createCreditNote.mutateAsync({ notes: creditNoteNotes || undefined });
      } catch {
        addToast('warning', t('refund.creditNoteFailed', 'Payment refunded but credit note creation failed. You can create it manually.'));
      }
    }

    // Auto-generate credit note if setting is enabled
    if (shouldAutoGenerateCN && invoice?.id) {
      try {
        await createCreditNote.mutateAsync({ notes: undefined });
      } catch {
        addToast('warning', t('refund.creditNoteFailed', 'Payment refunded but credit note creation failed. You can create it manually.'));
      }
    }

    setIsSubmitting(false);
    setCreditNoteNotes('');
    setGenerateCreditNote(true);
    onClose();
  }, [payments, refundPayment, showCreditNoteToggle, generateCreditNote, invoice, createCreditNote, creditNoteNotes, addToast, t, onClose, shouldAutoGenerateCN]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const buttonText = (showCreditNoteToggle && generateCreditNote) || shouldAutoGenerateCN
    ? t('refund.refundAndCreditNote', 'Refund & Credit Note')
    : t('refund.refund', 'Refund');

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('refund.refundTitle', 'Refund Payment?')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>{t('common.cancel')}</Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            {buttonText}
          </Button>
        </>
      }
    >
      <Stack gap={4}>
        <div className="space-y-2 text-body-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('orders.orderNum', 'Order')}</span>
            <span className="font-medium text-neutral-800">#{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('payments.customer', 'Customer')}</span>
            <span className="font-medium text-neutral-800">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('payments.amount', 'Amount')}</span>
            <span className="font-medium text-neutral-800">{order.totalAmount} {t('common.currency')}</span>
          </div>
        </div>

        <p className="text-body-sm text-neutral-600">
          {t('refund.refundMsg', 'This will mark the payment as refunded.')}
        </p>

        {creditNoteExists && (
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <p className="text-body-sm text-blue-800">
              {t('refund.creditNoteAlreadyExists', 'A credit note has already been issued for this order.')}
            </p>
          </div>
        )}

        {shouldAutoGenerateCN && (
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <p className="text-body-sm text-blue-800">
              {t('refund.autoCreditNoteNotice', 'A credit note will be generated automatically.')}
            </p>
          </div>
        )}

        {showCreditNoteToggle && (
          <>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateCreditNote}
                onChange={(e) => setGenerateCreditNote(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-body-sm text-neutral-700">
                {t('refund.generateCreditNote', 'Also generate a credit note')}
              </span>
            </label>

            {generateCreditNote && (
              <TextInput
                label={t('refund.creditNoteNotes', 'Credit note notes (optional)')}
                value={creditNoteNotes}
                onChange={(e) => setCreditNoteNotes(e.target.value)}
                placeholder=""
              />
            )}
          </>
        )}
      </Stack>
    </Modal>
  );
}
