import React from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/app';

interface TrialBadgeProps {
  daysRemaining: number;
  compact?: boolean;
  className?: string;
}

export const TrialBadge = React.memo(function TrialBadge({
  daysRemaining,
  compact = false,
  className,
}: TrialBadgeProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);
  const setSettingsSection = useAppStore((s) => s.setSettingsSection);

  const urgency =
    daysRemaining <= 0 ? 'red' : daysRemaining <= 3 ? 'amber' : 'blue';

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  };

  const handleClick = () => {
    setSettingsSection('store');
    setSettingsTab('subscription');
    navigate('/settings');
  };

  const label =
    daysRemaining <= 0
      ? t('subscription.trialEndsToday')
      : daysRemaining === 1
        ? t('subscription.trialDaysLeft_one')
        : t('subscription.trialDaysLeft', { count: daysRemaining });

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium transition-colors hover:opacity-80',
        colorClasses[urgency],
        className,
      )}
    >
      <Clock className={cn('h-3.5 w-3.5 shrink-0', iconColorClasses[urgency])} />
      {compact ? (
        <span>{daysRemaining}</span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
});
