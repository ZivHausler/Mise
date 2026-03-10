import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

interface ComingSoonBadgeProps {
  variant?: 'inline' | 'pill';
  className?: string;
}

export const ComingSoonBadge = React.memo(function ComingSoonBadge({
  variant = 'inline',
  className,
}: ComingSoonBadgeProps) {
  const { t } = useTranslation();
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5',
      variant === 'pill' && 'rounded-full bg-purple-50 px-2 py-0.5',
      className,
    )}>
      <Sparkles className={cn(
        'shrink-0 text-purple-400',
        variant === 'inline' ? 'h-3 w-3' : 'h-3.5 w-3.5',
      )} />
      <span className={cn(
        'font-medium text-purple-400',
        variant === 'inline' ? 'text-xs' : 'text-[10px]',
      )}>
        {t('nav.comingSoon')}
      </span>
    </span>
  );
});
