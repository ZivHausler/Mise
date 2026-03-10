import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X as XIcon, Info } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { PLAN_FEATURES, PLAN_PRICES } from '@/utils/subscription';

interface DowngradeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  targetPlan: string;
  onConfirm: () => Promise<void> | void;
  effectiveDate?: string;
  pendingDowngradeSlug?: string;
}

export const DowngradeWarningModal = React.memo(function DowngradeWarningModal({
  isOpen,
  onClose,
  currentPlan,
  targetPlan,
  onConfirm,
  effectiveDate,
  pendingDowngradeSlug,
}: DowngradeWarningModalProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Features in current plan that are NOT in target plan
  const currentFeatures = PLAN_FEATURES[currentPlan] ?? [];
  const targetFeatures = new Set(PLAN_FEATURES[targetPlan] ?? []);
  const lostFeatures = currentFeatures.filter((f) => !targetFeatures.has(f));

  const currentTierName = t(`subscription.tiers.${currentPlan}`);
  const targetTierName = t(`subscription.tiers.${targetPlan}`);
  const targetPrice = PLAN_PRICES[targetPlan] ?? 0;

  const formattedDate = effectiveDate
    ? new Date(effectiveDate).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handled by mutation
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>

        <h3 className="font-heading text-h3 text-neutral-800 mb-2">
          {t('subscription.downgradeTo', { plan: targetTierName })}
        </h3>

        {lostFeatures.length > 0 && (
          <div className="mb-4 w-full text-start">
            <p className="text-body-sm font-medium text-neutral-600 mb-2">
              {t('subscription.youllLoseAccess', "You'll lose access to:")}
            </p>
            <ul className="flex flex-col gap-1.5">
              {lostFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-body-sm text-neutral-600">
                  <XIcon className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{t(`subscription.features.${feature}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Effective date info box */}
        {effectiveDate && (
          <div className="mb-4 w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-start">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <p className="text-body-sm text-blue-700">
                {targetPlan === 'free'
                  ? t('subscription.downgradeEffective', {
                      currentPlan: currentTierName,
                      date: formattedDate,
                      targetPlan: targetTierName,
                    })
                  : t('subscription.downgradeEffectivePaid', {
                      currentPlan: currentTierName,
                      date: formattedDate,
                      targetPlan: targetTierName,
                      price: targetPrice,
                    })}
              </p>
            </div>
          </div>
        )}

        {/* Changing existing pending downgrade */}
        {pendingDowngradeSlug && pendingDowngradeSlug !== targetPlan && (
          <div className="mb-4 w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-start">
            <p className="text-body-sm text-amber-700">
              {t('subscription.changingDowngradeTarget', {
                oldPlan: t(`subscription.tiers.${pendingDowngradeSlug}`),
                newPlan: targetTierName,
              })}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 w-full">
          <Button variant="danger" fullWidth onClick={handleConfirm} loading={loading}>
            {t('subscription.confirmDowngrade')}
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>
            {t('subscription.keepPlan', { plan: currentTierName })}
          </Button>
        </div>
      </div>
    </Modal>
  );
});
