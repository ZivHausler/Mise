import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Check, Loader2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TierBadge } from '@/components/TierBadge';
import { PriceBreakdown } from '@/components/subscription/PriceBreakdown';
import { InlinePayPalCheckout } from '@/components/subscription/InlinePayPalCheckout';
import { PLAN_PRICES, PLAN_FEATURES } from '@/utils/subscription';
import { usePreviewPlanChange, useInitiateCheckout } from '@/api/hooks';
import { useQueryClient } from '@tanstack/react-query';

type Step = 'details' | 'payment';

interface ConfirmUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlanSlug: string;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
  isTrialing?: boolean;
  trialEndsAt?: string;
  currentPlanSlug?: string;
  trialSelectedPlan?: string;
}

export const ConfirmUpgradeModal = React.memo(function ConfirmUpgradeModal({
  isOpen,
  onClose,
  targetPlanSlug,
  onConfirm,
  loading: externalLoading,
  isTrialing,
  trialEndsAt,
  currentPlanSlug,
  trialSelectedPlan,
}: ConfirmUpgradeModalProps) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('details');
  const [internalLoading, setInternalLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    checkoutSessionId: string;
    paypalSubscriptionId: string;
  } | null>(null);

  const initiateCheckout = useInitiateCheckout();

  const isFirstSubscription = currentPlanSlug === 'free' && !isTrialing;
  const needsPreview = !isTrialing && !isFirstSubscription;
  const needsCheckout = true;

  const { data: preview, isLoading: previewLoading } = usePreviewPlanChange(
    needsPreview && isOpen ? targetPlanSlug : null,
  );

  const price = PLAN_PRICES[targetPlanSlug] ?? 0;
  const features = PLAN_FEATURES[targetPlanSlug] ?? [];
  const tierName = t(`subscription.tiers.${targetPlanSlug}`);
  const currentTierName = currentPlanSlug ? t(`subscription.tiers.${currentPlanSlug}`) : '';
  const loading = externalLoading || internalLoading;
  const inPaymentStep = step === 'payment';

  const handleContinueToPayment = useCallback(async () => {
    setInternalLoading(true);
    try {
      const result = await initiateCheckout.mutateAsync({ planSlug: targetPlanSlug });
      setCheckoutData({
        checkoutSessionId: result.checkoutSessionId,
        paypalSubscriptionId: result.paypalSubscriptionId,
      });
      setStep('payment');
    } catch {
      // Error handled by mutation
    } finally {
      setInternalLoading(false);
    }
  }, [initiateCheckout, targetPlanSlug]);

  const handleConfirm = useCallback(async () => {
    if (needsCheckout) {
      await handleContinueToPayment();
    } else {
      // Trial user selecting a plan (no payment needed now)
      setInternalLoading(true);
      try {
        await onConfirm();
        setSuccess(true);
      } catch {
        // Error handled by mutation
      } finally {
        setInternalLoading(false);
      }
    }
  }, [needsCheckout, handleContinueToPayment, onConfirm]);

  const handlePaymentSuccess = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['subscription'] });
    qc.invalidateQueries({ queryKey: ['features'] });
    qc.invalidateQueries({ queryKey: ['subscription', 'payments'] });
    setSuccess(true);
  }, [qc]);

  const handlePaymentError = useCallback(() => {
    // Error is displayed inline in the InlinePayPalCheckout component
  }, []);

  const handlePaymentCancel = useCallback(() => {
    // User closed PayPal popup — stay on payment step so they can retry
  }, []);

  const handleClose = useCallback(() => {
    setSuccess(false);
    setStep('details');
    setCheckoutData(null);
    onClose();
  }, [onClose]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  // Success state
  if (success) {
    return (
      <Modal open={isOpen} onClose={handleClose} size="sm">
        <div className="flex flex-col items-center text-center py-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="font-heading text-h3 text-neutral-800 mb-2">
            {t('subscription.welcomeTo', { plan: tierName })}
          </h3>
          <Button variant="primary" onClick={handleClose} className="mt-4">
            {t('subscription.payment.startExploring')}
          </Button>
        </div>
      </Modal>
    );
  }

  // Payment step — show inline PayPal checkout
  if (inPaymentStep && checkoutData) {
    return (
      <Modal open={isOpen} onClose={handleClose} size="sm" dismissible={false}>
        <div className="flex flex-col items-center text-center py-2">
          {targetPlanSlug !== 'free' && (
            <div className="mb-3">
              <TierBadge tier={targetPlanSlug as 'trial' | 'basic' | 'pro'} size="md" />
            </div>
          )}

          <h3 className="font-heading text-h3 text-neutral-800 mb-4">
            {t('subscription.upgradeTo', { plan: tierName })}
          </h3>

          <div className="w-full mb-2">
            <InlinePayPalCheckout
              paypalSubscriptionId={checkoutData.paypalSubscriptionId}
              checkoutSessionId={checkoutData.checkoutSessionId}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={handlePaymentCancel}
            />
          </div>

          <Button
            variant="ghost"
            fullWidth
            onClick={handleClose}
            className="mt-2"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>
    );
  }

  // Render CTA text based on scenario
  const renderCtaText = () => {
    if (needsCheckout) {
      return t('subscription.payment.continueToPayment');
    }
    if (isTrialing) {
      return t('subscription.trial.confirmPlan', { plan: tierName });
    }
    if (isFirstSubscription) {
      return t('subscription.subscribeFor', { price });
    }
    // Upgrade with proration
    if (preview) {
      const amountNis = (preview.immediateChargeAgorot / 100).toFixed(2);
      return t('subscription.payNow', { amount: amountNis });
    }
    return t('subscription.confirmUpgrade', { price });
  };

  return (
    <Modal open={isOpen} onClose={handleClose} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        {targetPlanSlug !== 'free' && (
          <div className="mb-3">
            <TierBadge tier={targetPlanSlug as 'trial' | 'basic' | 'pro'} size="md" />
          </div>
        )}

        <h3 className="font-heading text-h3 text-neutral-800 mb-4">
          {t('subscription.upgradeTo', { plan: tierName })}
        </h3>

        {/* Loading state for preview */}
        {needsPreview && previewLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        )}

        {/* Scenario A: Upgrade with proration */}
        {needsPreview && preview && (
          <div className="w-full mb-4">
            <PriceBreakdown
              currentPlanName={currentTierName}
              currentPriceNis={PLAN_PRICES[currentPlanSlug ?? 'free'] ?? 0}
              newPlanName={tierName}
              newPriceNis={price}
              daysRemaining={preview.daysRemaining}
              daysInPeriod={preview.daysInPeriod}
              amountDueAgorot={preview.immediateChargeAgorot}
            />
            <p className="mt-3 text-body-sm text-neutral-500">
              {t('subscription.priceBreakdown.nextRenewal', {
                date: formatDate(preview.nextRenewalDate),
                price: (preview.nextRenewalAmountAgorot / 100).toFixed(0),
              })}
            </p>
          </div>
        )}

        {/* Scenario B: First subscription (Free -> paid) */}
        {isFirstSubscription && (
          <div className="w-full mb-4 text-start">
            <ul className="flex flex-col gap-2 mb-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-body-sm text-neutral-700">
                  <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                  <span>{t(`subscription.features.${feature}`)}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-body-sm text-neutral-600">
              <p className="font-medium">{t('subscription.firstCharge', { price })}</p>
              <p className="mt-1">{t('subscription.renewsMonthly')}</p>
            </div>
          </div>
        )}

        {/* Scenario C: Trial user selecting a plan */}
        {isTrialing && (
          <div className="w-full mb-4 text-start">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-body-sm text-blue-700 mb-3">
              <p>{t('subscription.trial.keepFeatures', { date: trialEndsAt ? formatDate(trialEndsAt) : '' })}</p>
            </div>

            {trialSelectedPlan ? (
              <>
                <p className="text-body-sm text-neutral-600">
                  {t('subscription.trial.upgradeFromSelected', {
                    from: t(`subscription.tiers.${trialSelectedPlan}`),
                    to: tierName,
                    fromPrice: PLAN_PRICES[trialSelectedPlan] ?? 0,
                    toPrice: price,
                    difference: price - (PLAN_PRICES[trialSelectedPlan] ?? 0),
                  })}
                </p>
                <p className="mt-1 text-body-sm text-neutral-500">
                  {t('subscription.trial.renewsAtFullPrice', { price, plan: tierName })}
                </p>
              </>
            ) : (
              <p className="text-body-sm text-neutral-600">
                {t('subscription.trial.afterTrial', { plan: tierName, price })}
              </p>
            )}

            {trialEndsAt && (
              <p className="mt-2 text-body-sm text-neutral-500">
                {t('subscription.trial.firstChargeOn', { date: formatDate(trialEndsAt) })}
              </p>
            )}
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex flex-col gap-2 w-full">
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            loading={loading}
            disabled={needsPreview && previewLoading}
          >
            {renderCtaText()}
          </Button>
          <Button variant="ghost" fullWidth onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
});
