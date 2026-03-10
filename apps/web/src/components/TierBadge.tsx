import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

interface TierBadgeProps {
  tier: 'basic' | 'pro';
  size?: 'sm' | 'md';
  variant?: 'light' | 'dark';
  className?: string;
}

const tierStyles = {
  basic: {
    light: 'bg-blue-100 text-blue-700',
    dark: 'bg-blue-900/40 text-blue-300',
  },
  pro: {
    light: 'bg-amber-100 text-amber-700',
    dark: 'bg-amber-900/40 text-amber-300',
  },
};

export const TierBadge = React.memo(function TierBadge({
  tier,
  size = 'sm',
  variant = 'light',
  className,
}: TierBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase tracking-wide',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        tierStyles[tier][variant],
        className,
      )}
    >
      {t(`subscription.tiers.${tier}`)}
    </span>
  );
});
