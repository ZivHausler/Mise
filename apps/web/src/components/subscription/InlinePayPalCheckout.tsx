import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/Button';
import { useCheckoutStatus } from '@/api/hooks';

interface InlinePayPalCheckoutProps {
  paypalSubscriptionId: string;
  checkoutSessionId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

const PAYPAL_CLIENT_ID = import.meta.env['VITE_PAYPAL_CLIENT_ID'] ?? '';

type CheckoutState = 'ready' | 'processing' | 'polling' | 'error';

export const InlinePayPalCheckout = React.memo(function InlinePayPalCheckout({
  paypalSubscriptionId,
  checkoutSessionId,
  onSuccess,
  onError,
  onCancel,
}: InlinePayPalCheckoutProps) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<CheckoutState>('ready');
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const pollingEnabled = state === 'polling';
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const { data: checkoutStatus } = useCheckoutStatus(pollingEnabled ? checkoutSessionId : null);

  // Handle polling result
  useEffect(() => {
    if (!checkoutStatus) return;
    const s = checkoutStatus.status;
    if (s === 'completed') {
      onSuccessRef.current();
    } else if (s === 'failed' || s === 'expired') {
      setState('error');
      setErrorMessage(t('subscription.payment.genericError'));
    }
  }, [checkoutStatus, t]);

  const handleCreateSubscription = useCallback(
    (_data: Record<string, unknown>, _actions: unknown): Promise<string> => {
      // Subscription was already created server-side; just return its ID
      return Promise.resolve(paypalSubscriptionId);
    },
    [paypalSubscriptionId],
  );

  const handleApprove = useCallback(
    async (_data: unknown, _actions: unknown): Promise<void> => {
      setState('polling');
    },
    [],
  );

  const handleCancel = useCallback(() => {
    setState('ready');
    onCancel();
  }, [onCancel]);

  const handleError = useCallback(() => {
    setState('error');
    setErrorMessage(t('subscription.payment.genericError'));
    onError(t('subscription.payment.genericError'));
  }, [onError, t]);

  const handleRetry = useCallback(() => {
    setState('ready');
    setSdkError(false);
    setErrorMessage('');
  }, []);

  const locale = i18n.language === 'he' ? 'he_IL' : 'en_US';

  // SDK error state
  if (sdkError) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 w-full">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-body-sm text-red-700">
            {t('subscription.payment.sdkError')}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRetry}>
          {t('subscription.payment.retryLoading')}
        </Button>
      </div>
    );
  }

  // Error state from payment
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 w-full">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-body-sm text-red-700">{errorMessage}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRetry}>
          {t('subscription.payment.tryAgain')}
        </Button>
      </div>
    );
  }

  // Processing / polling overlay
  if (state === 'processing' || state === 'polling') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-body-sm font-medium text-neutral-700">
          {t('subscription.payment.processing')}
        </p>
        <p className="text-body-sm text-neutral-500">
          {t('subscription.payment.processingHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <PayPalScriptProvider
        options={{
          clientId: PAYPAL_CLIENT_ID,
          vault: true,
          intent: 'subscription',
          currency: 'ILS',
          locale,
        }}
      >
        {/* Shimmer placeholder while SDK loads */}
        {!sdkReady && (
          <div className="flex flex-col gap-2">
            <div className="h-[45px] w-full bg-neutral-200 animate-pulse rounded-lg" />
            <div className="h-[45px] w-full bg-neutral-100 animate-pulse rounded-lg" />
          </div>
        )}

        <div className={sdkReady ? '' : 'h-0 overflow-hidden'}>
          <PayPalButtons
            style={{
              shape: 'rect',
              color: 'gold',
              layout: 'vertical',
              label: 'subscribe',
            }}
            createSubscription={handleCreateSubscription}
            onApprove={handleApprove}
            onCancel={handleCancel}
            onError={handleError}
            onInit={() => setSdkReady(true)}
          />
        </div>
      </PayPalScriptProvider>

      {/* Secured by PayPal */}
      <div className="flex items-center justify-center gap-1.5 text-neutral-400">
        <Lock className="h-3.5 w-3.5" />
        <span className="text-body-sm">
          {t('subscription.payment.securedByPayPal')}
        </span>
      </div>
    </div>
  );
});
