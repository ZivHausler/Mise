import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Package, Users, ClipboardList, CreditCard, FileText, Bell, Factory, Heart, MessageCircle, Sparkles, ScanLine, LayoutDashboard } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TierBadge } from '@/components/TierBadge';
import { PLAN_PRICES } from '@/utils/subscription';
import { useAppStore } from '@/store/app';

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  customers: Users,
  orders: ClipboardList,
  payments: CreditCard,
  invoices: FileText,
  notifications: Bell,
  production: Factory,
  loyalty: Heart,
  whatsapp: MessageCircle,
  ai_chat: Sparkles,
  receiptScanner: ScanLine,
};

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey: string;
  requiredTier: 'basic' | 'pro';
}

export const UpgradePromptModal = React.memo(function UpgradePromptModal({
  isOpen,
  onClose,
  featureKey,
  requiredTier,
}: UpgradePromptModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);
  const Icon = FEATURE_ICONS[featureKey] ?? Lock;
  const price = PLAN_PRICES[requiredTier];
  const tierName = t(`subscription.tiers.${requiredTier}`);

  const setSettingsSection = useAppStore((s) => s.setSettingsSection);

  const handleViewPlans = () => {
    onClose();
    setSettingsSection('store');
    setSettingsTab('subscription');
    navigate('/settings');
  };

  const handleUpgrade = () => {
    onClose();
    setSettingsSection('store');
    setSettingsTab('subscription');
    navigate('/settings');
  };

  return (
    <Modal open={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
          <Icon className="h-8 w-8 text-primary-500" />
        </div>

        <h3 className="font-heading text-h3 text-neutral-800 mb-1">
          {t(`subscription.features.${featureKey}`)}
        </h3>

        <div className="mb-3">
          <TierBadge tier={requiredTier} size="md" />
        </div>

        <p className="text-body-sm text-neutral-500 mb-6 max-w-[280px]">
          {t(`subscription.featureDescriptions.${featureKey}`)}
        </p>

        <div className="flex flex-col gap-2 w-full">
          <Button variant="primary" fullWidth onClick={handleUpgrade}>
            {t('subscription.upgradeTo', { plan: tierName })}
            {' - '}
            <bdi>{price} {t('common.currency')}{t('subscription.perMonth')}</bdi>
          </Button>
          <Button variant="ghost" fullWidth onClick={handleViewPlans}>
            {t('subscription.viewAllPlans')}
          </Button>
        </div>
      </div>
    </Modal>
  );
});
