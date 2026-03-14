import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/app';

interface UpgradeHintProps {
  /** Which plan to suggest upgrading to */
  targetPlan: string;
  /** Visual variant for different placement contexts */
  variant: 'sidebar' | 'dashboard' | 'banner';
  className?: string;
}

export const UpgradeHint = React.memo(function UpgradeHint({
  targetPlan,
  variant,
  className,
}: UpgradeHintProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);
  const setSettingsSection = useAppStore((s) => s.setSettingsSection);

  const planName = t(`subscription.tiers.${targetPlan}`);

  const handleClick = () => {
    setSettingsSection('store');
    setSettingsTab('subscription');
    navigate('/settings');
  };

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm font-medium',
          'bg-primary-800 text-primary-200 hover:bg-primary-700 hover:text-white transition-colors',
          className,
        )}
      >
        <ArrowUpCircle className="h-4 w-4 shrink-0 text-amber-400" />
        <span className="truncate">{t('subscription.upgradeTo', { plan: planName })}</span>
      </button>
    );
  }

  if (variant === 'dashboard') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 p-4 text-start transition-colors hover:border-primary-400 hover:bg-primary-100',
          className,
        )}
      >
        <ArrowUpCircle className="h-6 w-6 shrink-0 text-primary-500" />
        <div>
          <p className="text-body-sm font-medium text-neutral-800">
            {t('subscription.upgradeHint', { plan: planName })}
          </p>
          <p className="text-caption text-neutral-500">{t('subscription.viewAllPlans')}</p>
        </div>
      </button>
    );
  }

  // variant === 'banner'
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg bg-primary-50 border border-primary-200 px-4 py-3',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <ArrowUpCircle className="h-5 w-5 text-primary-500" />
        <span className="text-body-sm text-neutral-700">
          {t('subscription.upgradeHint', { plan: planName })}
        </span>
      </div>
      <button
        onClick={handleClick}
        className="text-body-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        {t('subscription.viewAllPlans')}
      </button>
    </div>
  );
});
