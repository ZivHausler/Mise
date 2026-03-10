import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/Button';
import { TierBadge } from '@/components/TierBadge';
import { ComingSoonBadge } from '@/components/ComingSoonBadge';
import { useFeatureFlags } from '@/api/hooks';
import { PLAN_FEATURES, PLAN_PRICES, isTierHigher, isTierLower } from '@/utils/subscription';

// Map display feature keys to backend comingSoon keys
const FEATURE_TO_COMING_SOON: Record<string, string> = {
  production: 'production',
  receiptScanner: 'receipt_scanner',
  whatsapp: 'whatsapp',
};

interface PricingCardsProps {
  currentPlan: string;
  onSelectPlan: (slug: string) => void;
  loading?: boolean;
  pendingPlanSlug?: string;
  pendingDate?: string;
}

const PLANS = ['free', 'basic', 'pro'] as const;

export const PricingCards = React.memo(function PricingCards({
  currentPlan,
  onSelectPlan,
  loading,
  pendingPlanSlug,
  pendingDate,
}: PricingCardsProps) {
  const { t, i18n } = useTranslation();
  const { data: featureFlags } = useFeatureFlags();
  const comingSoon = featureFlags?.comingSoon ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PLANS.map((slug) => {
        const isCurrent = slug === currentPlan;
        const isBasic = slug === 'basic';
        const price = PLAN_PRICES[slug];
        const features = PLAN_FEATURES[slug] ?? [];
        const isUpgrade = isTierHigher(slug, currentPlan);
        const isDowngrade = isTierLower(slug, currentPlan);
        const isPending = slug === pendingPlanSlug;

        // Determine the "everything in lower tier" label
        const lowerTier = slug === 'basic' ? 'free' : slug === 'pro' ? 'basic' : null;

        const cardClickable = isUpgrade && !isPending;

        return (
          <div
            key={slug}
            onClick={cardClickable ? () => onSelectPlan(slug) : undefined}
            className={cn(
              'relative flex flex-col rounded-xl border-2 p-6 transition-all',
              isCurrent
                ? 'border-primary-500 bg-primary-50/50 shadow-md ring-2 ring-primary-300'
                : isBasic
                  ? 'border-primary-400 bg-white shadow-md'
                  : 'border-neutral-200 bg-white',
              cardClickable && 'cursor-pointer hover:shadow-lg hover:border-primary-400',
            )}
          >
            {/* Popular badge for Basic */}
            {isBasic && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-500 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {t('subscription.popular')}
              </span>
            )}

            {/* Plan header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-h3 text-neutral-800">
                  {t(`subscription.tiers.${slug}`)}
                </h3>
                {slug !== 'free' && <TierBadge tier={slug as 'basic' | 'pro'} />}
              </div>
              <p className="text-body-sm text-neutral-500">
                {t(`subscription.tierDescriptions.${slug}`)}
              </p>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-3xl text-neutral-800">{price}</span>
                <span className="text-body-sm text-neutral-500">{t('common.currency')}{t('subscription.perMonth')}</span>
              </div>
            </div>

            {/* Feature list */}
            <div className="mb-6 flex-1">
              {lowerTier && (
                <p className="text-body-sm font-medium text-neutral-600 mb-2">
                  {t('subscription.everythingIn', { plan: t(`subscription.tiers.${lowerTier}`) })}
                </p>
              )}
              <ul className="flex flex-col gap-2">
                {features.map((feature) => {
                  const csKey = FEATURE_TO_COMING_SOON[feature];
                  const isCS = csKey ? comingSoon.includes(csKey) : false;
                  return (
                    <li key={feature} className={cn('flex items-center gap-2 text-body-sm', isCS ? 'text-neutral-400' : 'text-neutral-700')}>
                      <Check className={cn('h-4 w-4 shrink-0', isCS ? 'text-neutral-300' : 'text-green-500')} />
                      <span className="flex-1">{t(`subscription.features.${feature}`)}</span>
                      {isCS && <ComingSoonBadge variant="inline" />}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* CTA */}
            {isCurrent ? (
              <div className="h-10" />
            ) : isPending ? (
              <Button variant="secondary" fullWidth disabled>
                {t('subscription.pendingDowngrade.switchingOn', {
                  date: pendingDate
                    ? new Date(pendingDate).toLocaleDateString(i18n.language, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '',
                })}
              </Button>
            ) : isUpgrade ? (
              <Button
                variant="primary"
                fullWidth
                onClick={(e) => { e.stopPropagation(); onSelectPlan(slug); }}
                loading={loading}
              >
                {t('subscription.upgradeTo', { plan: t(`subscription.tiers.${slug}`) })}
              </Button>
            ) : isDowngrade ? (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => onSelectPlan(slug)}
                loading={loading}
              >
                {t('subscription.downgradeTo', { plan: t(`subscription.tiers.${slug}`) })}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});
