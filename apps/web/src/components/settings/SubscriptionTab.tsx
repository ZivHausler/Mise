import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Section, Card } from '@/components/Layout';
import { Modal } from '@/components/Modal';
import { TierBadge } from '@/components/TierBadge';
import { PricingCards } from '@/components/subscription/PricingCards';
import { ConfirmUpgradeModal } from '@/components/subscription/ConfirmUpgradeModal';
import { DowngradeWarningModal } from '@/components/subscription/DowngradeWarningModal';
import { PendingDowngradeBanner } from '@/components/subscription/PendingDowngradeBanner';
import { FailedPaymentBanner } from '@/components/subscription/FailedPaymentBanner';
import { InlinePayPalCheckout } from '@/components/subscription/InlinePayPalCheckout';
import {
  useSubscription,
  useChangePlan,
  useCancelDowngrade,
  usePaymentHistory,
  useRenewalRecovery,
} from '@/api/hooks';
import { isTierHigher } from '@/utils/subscription';

const PAYMENT_TYPE_KEYS: Record<number, string> = {
  0: 'full',
  1: 'proration',
  2: 'refund',
};

const PAYMENT_STATUS_KEYS: Record<number, string> = {
  0: 'pending',
  1: 'succeeded',
  2: 'failed',
};

export default function SubscriptionTab() {
  const { t, i18n } = useTranslation();
  const { data: subscription } = useSubscription();
  const changePlan = useChangePlan();
  const cancelDowngrade = useCancelDowngrade();
  const { data: payments } = usePaymentHistory();
  const renewalRecovery = useRenewalRecovery();

  const qc = useQueryClient();
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);
  const [recoveryData, setRecoveryData] = useState<{
    checkoutSessionId: string;
    paypalSubscriptionId: string;
  } | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);

  const pricingRef = useRef<HTMLDivElement>(null);

  const currentPlan = (subscription as any)?.planSlug ?? 'free';
  const planName = t(`subscription.tiers.${currentPlan}`);
  const status = (subscription as any)?.status;
  const isTrialing = status === 'trialing';
  const isPastDue = status === 'past_due';
  const trialEndsAt = (subscription as any)?.trialEndsAt;
  const currentPeriodEnd = (subscription as any)?.currentPeriodEnd;
  const cancelAtPeriodEnd = (subscription as any)?.cancelAtPeriodEnd;
  const downgradeToSlug = (subscription as any)?.downgradeToSlug;

  const hasPendingDowngrade = !!downgradeToSlug && cancelAtPeriodEnd;

  const handleSelectPlan = useCallback(
    (slug: string) => {
      if (isTierHigher(slug, currentPlan)) {
        setUpgradeTarget(slug);
      } else {
        setDowngradeTarget(slug);
      }
    },
    [currentPlan],
  );

  // Confirm for trial users (no external checkout needed)
  const handleConfirmUpgrade = async () => {
    if (!upgradeTarget) return;
    await changePlan.mutateAsync(upgradeTarget);
    setUpgradeTarget(null);
  };

  const handleConfirmDowngrade = async () => {
    if (!downgradeTarget) return;
    await changePlan.mutateAsync(downgradeTarget);
    setDowngradeTarget(null);
  };

  const handleCancelDowngrade = useCallback(() => {
    cancelDowngrade.mutate();
  }, [cancelDowngrade]);

  const handleScrollToPricing = useCallback(() => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Recovery checkout for past_due — opens inline PayPal modal
  const handleRecoveryPayment = useCallback(async () => {
    setRecoveryPending(true);
    try {
      const result = await renewalRecovery.mutateAsync();
      setRecoveryData({
        checkoutSessionId: result.checkoutSessionId,
        paypalSubscriptionId: result.paypalSubscriptionId,
      });
    } catch {
      // Error handled by mutation
    } finally {
      setRecoveryPending(false);
    }
  }, [renewalRecovery]);

  const handleRecoverySuccess = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['subscription'] });
    qc.invalidateQueries({ queryKey: ['features'] });
    qc.invalidateQueries({ queryKey: ['subscription', 'payments'] });
    setRecoveryData(null);
  }, [qc]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  // Trial days remaining
  const trialDays = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Failed Payment Banner */}
      {isPastDue && (
        <FailedPaymentBanner
          planName={planName}
          onCompletePayment={handleRecoveryPayment}
          loading={recoveryPending}
        />
      )}

      {/* Current Plan Card */}
      <Section title={t('subscription.currentPlan')}>
        <Card variant="flat" className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-heading text-h3 text-neutral-800">{planName}</h3>
              {currentPlan !== 'free' && (
                <TierBadge tier={currentPlan as 'basic' | 'pro'} size="md" />
              )}
            </div>

            {isTrialing && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="text-body-sm font-medium text-amber-600">
                    {trialDays === 0
                      ? t('subscription.trialEndsToday')
                      : trialDays === 1
                        ? t('subscription.trialDaysLeft_one')
                        : t('subscription.trialDaysLeft', { count: trialDays })}
                  </span>
                  {/* Progress bar */}
                  <div className="mt-1 h-1.5 w-32 rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${Math.max(5, ((14 - trialDays) / 14) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isTrialing && currentPlan !== 'free' && currentPeriodEnd && (
            <p className="mt-2 text-body-sm text-neutral-500">
              {t('subscription.renewsOn', { date: formatDate(currentPeriodEnd) })}
            </p>
          )}
        </Card>
      </Section>

      {/* Pending Downgrade Banner */}
      {hasPendingDowngrade && currentPeriodEnd && (
        <PendingDowngradeBanner
          currentPlanName={planName}
          targetPlanName={t(`subscription.tiers.${downgradeToSlug}`)}
          effectiveDate={currentPeriodEnd}
          onCancelDowngrade={handleCancelDowngrade}
          onChangePlan={handleScrollToPricing}
          cancelLoading={cancelDowngrade.isPending}
        />
      )}

      {/* Plans */}
      <div ref={pricingRef}>
        <Section title={t('subscription.plans')}>
          <PricingCards
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlan}
            loading={changePlan.isPending}
            pendingPlanSlug={hasPendingDowngrade ? downgradeToSlug : undefined}
            pendingDate={hasPendingDowngrade ? currentPeriodEnd : undefined}
          />
        </Section>
      </div>

      {/* Billing History */}
      <Section title={t('subscription.billingHistory')}>
        <Card variant="flat" className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="pb-2 text-start font-medium text-neutral-500">
                    {t('subscription.billing.date')}
                  </th>
                  <th className="pb-2 text-start font-medium text-neutral-500">
                    {t('subscription.billing.description')}
                  </th>
                  <th className="pb-2 text-start font-medium text-neutral-500">
                    {t('subscription.billing.amount')}
                  </th>
                  <th className="pb-2 text-start font-medium text-neutral-500">
                    {t('subscription.billing.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments && payments.length > 0 ? (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-neutral-100">
                      <td className="py-3 text-neutral-700">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="py-3 text-neutral-700">
                        {t(`subscription.paymentTypes.${PAYMENT_TYPE_KEYS[payment.type] ?? 'full'}`)}
                      </td>
                      <td className="py-3 text-neutral-700">
                        {(payment.amountAgorot / 100).toFixed(2)} {t('common.currency')}
                      </td>
                      <td className="py-3">
                        <span
                          className={
                            payment.status === 1
                              ? 'text-green-600'
                              : payment.status === 2
                                ? 'text-red-500'
                                : 'text-amber-600'
                          }
                        >
                          {t(`subscription.paymentStatuses.${PAYMENT_STATUS_KEYS[payment.status] ?? 'pending'}`)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 text-neutral-400" colSpan={4}>
                      {t('subscription.noBillingHistory')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* Modals */}
      {upgradeTarget && (
        <ConfirmUpgradeModal
          isOpen={!!upgradeTarget}
          onClose={() => setUpgradeTarget(null)}
          targetPlanSlug={upgradeTarget}
          onConfirm={handleConfirmUpgrade}
          loading={changePlan.isPending}
          isTrialing={isTrialing}
          trialEndsAt={trialEndsAt}
          currentPlanSlug={currentPlan}
        />
      )}
      {downgradeTarget && (
        <DowngradeWarningModal
          isOpen={!!downgradeTarget}
          onClose={() => setDowngradeTarget(null)}
          currentPlan={currentPlan}
          targetPlan={downgradeTarget}
          onConfirm={handleConfirmDowngrade}
          effectiveDate={currentPeriodEnd}
          pendingDowngradeSlug={hasPendingDowngrade ? downgradeToSlug : undefined}
        />
      )}

      {/* Recovery payment modal (past_due) */}
      {recoveryData && (
        <Modal open onClose={() => setRecoveryData(null)} size="sm" dismissible={false}>
          <div className="flex flex-col items-center text-center py-2">
            <TierBadge tier={currentPlan as 'basic' | 'pro'} size="md" />
            <h3 className="font-heading text-h3 text-neutral-800 my-4">
              {t('subscription.completePayment')}
            </h3>
            <div className="w-full mb-2">
              <InlinePayPalCheckout
                paypalSubscriptionId={recoveryData.paypalSubscriptionId}
                checkoutSessionId={recoveryData.checkoutSessionId}
                onSuccess={handleRecoverySuccess}
                onError={() => {}}
                onCancel={() => {}}
              />
            </div>
            <button
              type="button"
              onClick={() => setRecoveryData(null)}
              className="mt-2 text-body-sm text-neutral-500 hover:text-neutral-700"
            >
              {t('common.cancel')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
