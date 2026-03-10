import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Button } from '@/components/Button';

interface PendingDowngradeBannerProps {
  currentPlanName: string;
  targetPlanName: string;
  effectiveDate: string;
  onCancelDowngrade: () => void;
  onChangePlan: () => void;
  cancelLoading?: boolean;
}

export const PendingDowngradeBanner = React.memo(function PendingDowngradeBanner({
  currentPlanName,
  targetPlanName,
  effectiveDate,
  onCancelDowngrade,
  onChangePlan,
  cancelLoading,
}: PendingDowngradeBannerProps) {
  const { t, i18n } = useTranslation();

  const formattedDate = new Date(effectiveDate).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-800 mb-1">
            {t('subscription.pendingDowngrade.title')}
          </h4>
          <p className="text-body-sm text-amber-700 mb-3">
            {t('subscription.pendingDowngrade.message', {
              plan: targetPlanName,
              date: formattedDate,
              currentPlan: currentPlanName,
            })}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCancelDowngrade}
              loading={cancelLoading}
            >
              {t('subscription.pendingDowngrade.cancelDowngrade')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onChangePlan}>
              {t('subscription.pendingDowngrade.changePlan')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
