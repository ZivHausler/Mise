import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RefreshCw } from 'lucide-react';
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
  useTrialDowngrade,
} from '@/api/hooks';
import { isTierHigher, PLAN_PRICES } from '@/utils/subscription';

// ─── Trial Switch Confirm Modal ───────────────────────────────────────────────
function TrialSwitchConfirmContent({
  fromPlan,
  toPlan,
  onConfirm,
  onClose,
  loading,
}: {
  fromPlan: string;
  toPlan: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const fromPrice = PLAN_PRICES[fromPlan] ?? 0;
  const toPrice = PLAN_PRICES[toPlan] ?? 0;
  const refundAmount = Math.max(0, fromPrice - toPrice);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handled by mutation
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
        <RefreshCw className="h-7 w-7 text-blue-500" />
      </div>
      <h3 className="font-heading text-h3 text-neutral-800 mb-2" dir="auto">
        {t('subscription.trial.switchTo', { plan: t(`subscription.tiers.${toPlan}`) })}
      </h3>
      <p className="text-body-sm text-neutral-600 mb-4" dir="auto">
        {t('subscription.trial.switchConfirm', {
          from: t(`subscription.tiers.${fromPlan}`),
          to: t(`subscription.tiers.${toPlan}`),
          amount: refundAmount,
        })}
      </p>
      <div className="flex flex-col gap-2 w-full">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || loading}
          className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-body-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {submitting || loading ? t('common.loading') : t('subscription.trial.switchTo', { plan: t(`subscription.tiers.${toPlan}`) })}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting || loading}
          className="w-full rounded-lg px-4 py-2.5 text-body-sm font-medium text-neutral-600 hover:text-neutral-800 disabled:opacity-50 transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

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
  const trialDowngrade = useTrialDowngrade();

  const qc = useQueryClient();
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);
  const [trialSwitchTarget, setTrialSwitchTarget] = useState<string | null>(null);
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

  const hasPendingDowngrade = !isTrialing && !!downgradeToSlug && cancelAtPeriodEnd;
  const trialSelectedPlan = isTrialing && !!downgradeToSlug ? downgradeToSlug : null;

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

  const handleTrialSwitchSelect = useCallback((slug: string) => {
    setTrialSwitchTarget(slug);
  }, []);

  const handleConfirmTrialSwitch = async () => {
    if (!trialSwitchTarget) return;
    await trialDowngrade.mutateAsync(trialSwitchTarget);
    setTrialSwitchTarget(null);
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
          {isTrialing ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <TierBadge tier="pro" size="md" />
                  <span className="text-body-sm text-neutral-400">{t('subscription.trial.label', 'Trial')}</span>
                  {trialSelectedPlan && (
                    <>
                      <ArrowRight className="h-4 w-4 text-neutral-300 mx-1 rtl:-scale-x-100" />
                      <TierBadge tier={trialSelectedPlan as 'trial' | 'basic' | 'pro'} size="md" />
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-body-sm font-medium text-amber-600">
                    {trialDays === 0
                      ? t('subscription.trialEndsToday')
                      : trialDays === 1
                        ? t('subscription.trialDaysLeft_one')
                        : t('subscription.trialDaysLeft', { count: trialDays })}
                  </span>
                  <div className="mt-1 h-1.5 w-32 rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${Math.max(5, ((14 - trialDays) / 14) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              {trialSelectedPlan && (
                <p className="mt-3 text-body-sm text-neutral-500">
                  {t('subscription.trial.selectedPlan', {
                    plan: t(`subscription.tiers.${trialSelectedPlan}`),
                    date: trialEndsAt ? formatDate(trialEndsAt) : '',
                  })}
                </p>
              )}
              {!trialSelectedPlan && (
                <p className="mt-3 text-body-sm text-neutral-500">
                  {t('subscription.trial.choosePlan', 'Choose a plan below to continue after your trial ends.')}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-heading text-h3 text-neutral-800">{planName}</h3>
                  {currentPlan !== 'free' && (
                    <TierBadge tier={currentPlan as 'trial' | 'basic' | 'pro'} size="md" />
                  )}
                </div>
              </div>
              {currentPlan !== 'free' && currentPeriodEnd && (
                <p className="mt-2 text-body-sm text-neutral-500">
                  {t('subscription.renewsOn', { date: formatDate(currentPeriodEnd) })}
                </p>
              )}
            </>
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
            onTrialSwitch={handleTrialSwitchSelect}
            loading={changePlan.isPending || trialDowngrade.isPending}
            pendingPlanSlug={hasPendingDowngrade ? downgradeToSlug : undefined}
            pendingDate={hasPendingDowngrade ? currentPeriodEnd : undefined}
            isTrialing={isTrialing}
            trialSelectedPlan={trialSelectedPlan ?? undefined}
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
          trialSelectedPlan={trialSelectedPlan ?? undefined}
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

      {/* Trial switch modal — downgrade within trial with refund */}
      {trialSwitchTarget && (
        <Modal open onClose={() => setTrialSwitchTarget(null)} size="sm">
          <TrialSwitchConfirmContent
            fromPlan={trialSelectedPlan ?? ''}
            toPlan={trialSwitchTarget}
            onConfirm={handleConfirmTrialSwitch}
            onClose={() => setTrialSwitchTarget(null)}
            loading={trialDowngrade.isPending}
          />
        </Modal>
      )}

      {/* Recovery payment modal (past_due) */}
      {recoveryData && (
        <Modal open onClose={() => setRecoveryData(null)} size="sm" dismissible={false}>
          <div className="flex flex-col items-center text-center py-2">
            <TierBadge tier={currentPlan as 'trial' | 'basic' | 'pro'} size="md" />
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
