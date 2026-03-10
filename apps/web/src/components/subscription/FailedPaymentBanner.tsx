import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Button';

interface FailedPaymentBannerProps {
  planName: string;
  onCompletePayment: () => void;
  loading?: boolean;
}

export const FailedPaymentBanner = React.memo(function FailedPaymentBanner({
  planName,
  onCompletePayment,
  loading,
}: FailedPaymentBannerProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-800 mb-1">
            {t('subscription.payment.failedPayment')}
          </h4>
          <p className="text-body-sm text-red-700 mb-3">
            {t('subscription.payment.failedPaymentMessage', { plan: planName })}
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={onCompletePayment}
            loading={loading}
          >
            {t('subscription.payment.completePayment')}
          </Button>
        </div>
      </div>
    </div>
  );
});
