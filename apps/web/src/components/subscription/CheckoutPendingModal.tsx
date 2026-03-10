import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';

interface CheckoutPendingModalProps {
  isOpen: boolean;
  status?: 'pending' | 'completed' | 'failed';
  onCancel: () => void;
  onDone: () => void;
  onRetry?: () => void;
}

const TIMEOUT_MS = 120_000;
const SUCCESS_DISPLAY_MS = 3_000;

export const CheckoutPendingModal = React.memo(function CheckoutPendingModal({
  isOpen,
  status = 'pending',
  onCancel,
  onDone,
  onRetry,
}: CheckoutPendingModalProps) {
  const { t } = useTranslation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Auto-close after showing success for a few seconds
  useEffect(() => {
    if (status === 'completed') {
      const timer = setTimeout(() => onDone(), SUCCESS_DISPLAY_MS);
      return () => clearTimeout(timer);
    }
  }, [status, onDone]);

  return (
    <Modal open={isOpen} onClose={onCancel} size="sm" dismissible={false}>
      <div className="flex flex-col items-center text-center py-6">
        {status === 'completed' ? (
          <>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="font-heading text-h3 text-neutral-800 mb-2">
              {t('subscription.payment.paymentApproved')}
            </h3>
            <p className="text-body-sm text-neutral-500 mb-6">
              {t('subscription.payment.paymentApprovedHint')}
            </p>
            <Button variant="primary" fullWidth onClick={onDone}>
              {t('common.done')}
            </Button>
          </>
        ) : status === 'failed' ? (
          <>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="font-heading text-h3 text-neutral-800 mb-2">
              {t('subscription.payment.paymentFailed')}
            </h3>
            <p className="text-body-sm text-neutral-500 mb-6">
              {t('subscription.payment.paymentFailedHint')}
            </p>
            <div className="flex flex-col gap-2 w-full">
              {onRetry && (
                <Button variant="primary" fullWidth onClick={onRetry}>
                  {t('subscription.payment.tryAgain')}
                </Button>
              )}
              <Button variant="ghost" fullWidth onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        ) : timedOut ? (
          <>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <Loader2 className="h-7 w-7 text-amber-500" />
            </div>
            <h3 className="font-heading text-h3 text-neutral-800 mb-2">
              {t('subscription.payment.paymentNotCompleted')}
            </h3>
            <p className="text-body-sm text-neutral-500 mb-6">
              {t('subscription.payment.paymentNotCompletedHint')}
            </p>
            <div className="flex flex-col gap-2 w-full">
              {onRetry && (
                <Button variant="primary" fullWidth onClick={onRetry}>
                  {t('subscription.payment.tryAgain')}
                </Button>
              )}
              <Button variant="ghost" fullWidth onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
            <h3 className="font-heading text-h3 text-neutral-800 mb-2">
              {t('subscription.payment.checkoutPending')}
            </h3>
            <p className="text-body-sm text-neutral-500 mb-6">
              {t('subscription.payment.checkoutPendingHint')}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
});
