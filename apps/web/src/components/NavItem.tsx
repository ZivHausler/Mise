import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { useFeatureFlags } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';
import { TierBadge } from './TierBadge';
import { ComingSoonBadge } from './ComingSoonBadge';
import { UpgradePromptModal } from './subscription/UpgradePromptModal';
import { FEATURE_TIER_MAP } from '@/utils/subscription';

type FeatureFlagKey = 'dashboard' | 'customers' | 'orders' | 'payments' | 'invoices' | 'notifications' | 'production' | 'whatsapp' | 'sms' | 'ai_chat' | 'loyalty' | 'loyaltyEnhancements' | 'receiptScanner';

// Map frontend feature flag keys to backend comingSoon keys
const COMING_SOON_KEY_MAP: Partial<Record<FeatureFlagKey, string>> = {
  production: 'production',
  receiptScanner: 'receipt_scanner',
  whatsapp: 'whatsapp',
};

interface NavItemProps {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  /** When set, the item checks this feature flag and renders as locked if disabled */
  featureFlag?: FeatureFlagKey;
  /** Visual variant matching the navigation context */
  variant: 'sidebar' | 'mobile' | 'more';
  /** Whether the sidebar is collapsed (only relevant for variant="sidebar") */
  collapsed?: boolean;
  /** Called when the item is clicked (used by mobile nav to close drawer) */
  onClick?: () => void;
  /** data-tour attribute for guided tours */
  tourId?: string;
  /** Optional badge count to display (e.g. pending orders) */
  badge?: number;
}

export const NavItem = React.memo(function NavItem({
  path,
  icon: Icon,
  labelKey,
  featureFlag,
  variant,
  collapsed,
  onClick,
  tourId,
  badge,
}: NavItemProps) {
  const { t } = useTranslation();
  const { data: featureFlags } = useFeatureFlags();
  const isLocked = featureFlag ? !featureFlags?.[featureFlag] : false;

  // Check if this feature is "coming soon" (not ready yet, regardless of tier)
  const comingSoonKey = featureFlag ? COMING_SOON_KEY_MAP[featureFlag] : undefined;
  const isComingSoon = comingSoonKey ? featureFlags?.comingSoon?.includes(comingSoonKey) ?? false : false;

  // Hide locked items entirely for employees (role 3)
  const stores = useAuthStore((s) => s.stores);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const activeRole = stores.find((s) => String(s.storeId) === String(activeStoreId))?.role;
  const isEmployee = activeRole === 3;

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const requiredTier = featureFlag ? FEATURE_TIER_MAP[featureFlag] : undefined;

  const handleLockedClick = useCallback(() => {
    setUpgradeModalOpen(true);
  }, []);

  // Coming soon — show disabled item with badge, no upgrade prompt
  if (isComingSoon) {
    return (
      <ComingSoonItem
        icon={Icon}
        labelKey={labelKey}
        variant={variant}
        collapsed={collapsed}
        tourId={tourId}
      />
    );
  }

  // Employees don't see locked features at all
  if (isLocked && isEmployee) {
    return null;
  }

  if (isLocked) {
    return (
      <>
        <LockedItem
          icon={Icon}
          labelKey={labelKey}
          variant={variant}
          collapsed={collapsed}
          tourId={tourId}
          requiredTier={requiredTier}
          onClick={handleLockedClick}
        />
        {upgradeModalOpen && requiredTier && featureFlag &&
          ReactDOM.createPortal(
            <UpgradePromptModal
              isOpen={upgradeModalOpen}
              onClose={() => setUpgradeModalOpen(false)}
              featureKey={featureFlag}
              requiredTier={requiredTier}
            />,
            document.body,
          )}
      </>
    );
  }

  if (variant === 'more') {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-between rounded-lg bg-white p-4 text-start shadow-xs transition-shadow hover:shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary-500" />
          <span className="text-body font-medium text-neutral-800">{t(labelKey)}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-400 rtl:scale-x-[-1]" />
      </button>
    );
  }

  if (variant === 'mobile') {
    return (
      <a
        href={path}
        onClick={onClick}
        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-primary-200 hover:bg-primary-800 hover:text-white"
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{t(labelKey)}</span>
      </a>
    );
  }

  // variant === 'sidebar'
  return (
    <NavLink
      to={path}
      end={path === '/'}
      data-tour={tourId}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm transition-colors',
          isActive
            ? 'bg-primary-800 text-white border-s-4 border-primary-500'
            : 'text-primary-300 hover:bg-primary-800 hover:text-white'
        )
      }
    >
      <span className="relative">
        <Icon className="h-5 w-5 shrink-0" />
        {collapsed && badge != null && badge > 0 && (
          <span className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-primary-900" />
        )}
      </span>
      {!collapsed && <span className="flex-1">{t(labelKey)}</span>}
      {!collapsed && badge != null && badge > 0 && (
        <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
});

/** Coming soon state — non-interactive with a "Coming Soon" badge */
const ComingSoonItem = React.memo(function ComingSoonItem({
  icon: Icon,
  labelKey,
  variant,
  collapsed,
  tourId,
}: Pick<NavItemProps, 'icon' | 'labelKey' | 'variant' | 'collapsed' | 'tourId'>) {
  const { t } = useTranslation();

  if (variant === 'more') {
    return (
      <div className="flex items-center justify-between rounded-lg bg-white p-4 text-start opacity-60">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-neutral-400" />
          <span className="text-body font-medium text-neutral-500">{t(labelKey)}</span>
        </div>
        <ComingSoonBadge variant="pill" />
      </div>
    );
  }

  // sidebar + mobile
  if (variant === 'sidebar' && collapsed) {
    return (
      <div
        data-tour={tourId}
        className="flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-primary-600"
      >
        <Icon className="h-5 w-5 shrink-0" />
        <ComingSoonBadge variant="inline" className="flex-col text-center" />
      </div>
    );
  }

  return (
    <div
      data-tour={tourId}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-primary-600"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-start">{t(labelKey)}</span>
      <ComingSoonBadge variant="inline" />
    </div>
  );
});

/** Locked state — clickable with lock icon + tier badge */
const LockedItem = React.memo(function LockedItem({
  icon: Icon,
  labelKey,
  variant,
  collapsed,
  tourId,
  requiredTier,
  onClick,
}: Pick<NavItemProps, 'icon' | 'labelKey' | 'variant' | 'collapsed' | 'tourId'> & {
  requiredTier?: 'basic' | 'pro';
  onClick?: () => void;
}) {
  const { t } = useTranslation();

  if (variant === 'more') {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-between rounded-lg bg-white p-4 text-start opacity-75 transition-shadow hover:shadow-sm hover:opacity-100"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-neutral-400" />
          <span className="text-body font-medium text-neutral-500">{t(labelKey)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-neutral-400" />
          {requiredTier && <TierBadge tier={requiredTier} size="sm" />}
        </div>
      </button>
    );
  }

  // sidebar + mobile share the dark-bg locked style
  return (
    <button
      data-tour={tourId}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-primary-600 transition-colors hover:text-primary-400 hover:bg-primary-800/50"
    >
      <Icon className="h-5 w-5 shrink-0" />
      {variant === 'sidebar' && collapsed ? (
        <Lock className="h-3.5 w-3.5 text-primary-600" />
      ) : (
        <>
          <span className="flex-1 text-start">{t(labelKey)}</span>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-primary-600" />
            {requiredTier && <TierBadge tier={requiredTier} size="sm" variant="dark" />}
          </div>
        </>
      )}
    </button>
  );
});
