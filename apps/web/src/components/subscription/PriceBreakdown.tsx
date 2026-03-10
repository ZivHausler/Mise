import React from 'react';
import { useTranslation } from 'react-i18next';

interface PriceBreakdownProps {
  currentPlanName: string;
  currentPriceNis: number;
  newPlanName: string;
  newPriceNis: number;
  daysRemaining: number;
  daysInPeriod: number;
  amountDueAgorot: number;
}

function formatNis(agorot: number): string {
  return (agorot / 100).toFixed(2);
}

export const PriceBreakdown = React.memo(function PriceBreakdown({
  currentPlanName,
  currentPriceNis,
  newPlanName,
  newPriceNis,
  daysRemaining,
  daysInPeriod,
  amountDueAgorot,
}: PriceBreakdownProps) {
  const { t } = useTranslation();

  const creditAgorot = Math.round((currentPriceNis * 100 * daysRemaining) / daysInPeriod);
  const newCostAgorot = Math.round((newPriceNis * 100 * daysRemaining) / daysInPeriod);

  return (
    <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-body-sm">
      <h4 className="font-semibold text-neutral-800 mb-3">
        {t('subscription.priceBreakdown.title')}
      </h4>

      {/* Plan prices */}
      <div className="flex justify-between mb-1">
        <span className="text-neutral-600">
          {t('subscription.priceBreakdown.currentPlan', { plan: currentPlanName })}
        </span>
        <span className="text-neutral-700">{currentPriceNis} {t('common.currency')}{t('subscription.perMonth')}</span>
      </div>
      <div className="flex justify-between mb-2">
        <span className="text-neutral-600">
          {t('subscription.priceBreakdown.newPlan', { plan: newPlanName })}
        </span>
        <span className="text-neutral-700">{newPriceNis} {t('common.currency')}{t('subscription.perMonth')}</span>
      </div>

      <div className="border-t border-neutral-200 my-2" />

      {/* Proration details */}
      <div className="flex justify-between mb-1">
        <span className="text-neutral-600">
          {t('subscription.priceBreakdown.daysRemaining')}
        </span>
        <span className="text-neutral-700">
          {t('subscription.priceBreakdown.daysCount', { count: daysRemaining })}
        </span>
      </div>
      <div className="flex justify-between mb-1">
        <span className="text-neutral-600">
          {t('subscription.priceBreakdown.creditFrom', { plan: currentPlanName })}
        </span>
        <span className="text-green-600">-{formatNis(creditAgorot)} {t('common.currency')}</span>
      </div>
      <div className="flex justify-between mb-2">
        <span className="text-neutral-600">
          {t('subscription.priceBreakdown.costForDays', { plan: newPlanName, count: daysRemaining })}
        </span>
        <span className="text-neutral-700">{formatNis(newCostAgorot)} {t('common.currency')}</span>
      </div>

      <div className="border-t border-neutral-200 my-2" />

      {/* Total */}
      <div className="flex justify-between font-semibold text-neutral-800">
        <span>{t('subscription.priceBreakdown.dueToday')}</span>
        <span>{formatNis(amountDueAgorot)} {t('common.currency')}</span>
      </div>
    </div>
  );
});
