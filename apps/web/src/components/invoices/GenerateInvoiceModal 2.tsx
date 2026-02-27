import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useCreateInvoice, useCreateCreditNote, useCurrentStore, downloadPdf } from '@/api/hooks';
import { useAppStore } from '@/store/app';

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: { id: number; orderNumber: number; customerName: string; totalAmount: number };
  type: 'invoice' | 'credit_note';
  originalInvoiceId?: number;
}

export function GenerateInvoiceModal({ isOpen, onClose, order, type, originalInvoiceId }: GenerateInvoiceModalProps) {
  const { t } = useTranslation();
  const language = useAppStore((s) => s.language);
  const { data: currentStore } = useCurrentStore();
  const hasTaxNumber = !!currentStore?.taxNumber;

  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const createInvoice = useCreateInvoice();
  const createCreditNote = useCreateCreditNote(originalInvoiceId ?? 0);

  const isCredit = type === 'credit_note';
  const title = isCredit
    ? t('invoices.generateCreditNote', 'Generate Credit Note')
    : t('invoices.generate', 'Generate Invoice');

  const handleGenerate = useCallback(() => {
    const onSuccess = (data: any) => {
      const displayNumber = data?.displayNumber ?? data?.invoiceNumber ?? '';
      const id = data?.id;
      if (id) {
        downloadPdf(`/invoices/${id}/pdf?lang=${language}`, `invoice-${displayNumber}.pdf`);
      }
      onClose();
      setNotes('');
    };

    if (isCredit && originalInvoiceId) {
      createCreditNote.mutate(
        { notes: notes || undefined },
        { onSuccess },
      );
    } else {
      createInvoice.mutate(
        { orderId: order.id, notes: notes || undefined, invoiceDate },
        { onSuccess },
      );
    }
  }, [isCredit, originalInvoiceId, createCreditNote, createInvoice, order.id, notes, invoiceDate, language, onClose]);

  const isPending = createInvoice.isPending || createCreditNote.isPending;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            loading={isPending}
            disabled={!hasTaxNumber}
          >
            {title}
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
      </Stack>
    </Modal>
  );
}
