import React from 'react';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader } from '@/components/Layout';
import Tabs from '@/components/Tabs';
import UnitsTab from '@/components/settings/UnitsTab';
import AllergensTab from '@/components/settings/AllergensTab';
import TagsTab from '@/components/settings/TagsTab';
import AccountTab from '@/components/settings/AccountTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import TeamTab from '@/components/settings/TeamTab';
import LoyaltyTab from '@/components/settings/LoyaltyTab';
import IntegrationsTab from '@/components/settings/IntegrationsTab';
import BillingTab from '@/components/settings/BillingTab';
import SubscriptionTab from '@/components/settings/SubscriptionTab';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useFeatureFlags } from '@/api/hooks';
import { STORE_ROLES } from '@/constants/defaults';

export default function SettingsPage() {
  const { t } = useTranslation();
  const activeTab = useAppStore((s) => s.settingsTab);
  const setActiveTab = useAppStore((s) => s.setSettingsTab);
  const stores = useAuthStore((s) => s.stores);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { data: featureFlags } = useFeatureFlags();

  const isOwner = stores[0]?.role === STORE_ROLES.OWNER || isAdmin;
  const loyaltyEnabled = featureFlags?.loyalty ?? false;

  const tabs = [
    { key: 'account' as const, label: t('settings.tabs.account', 'Account') },
    { key: 'team' as const, label: t('settings.tabs.team', 'Team') },
    { key: 'units' as const, label: t('settings.tabs.units', 'Units') },
    { key: 'allergens' as const, label: t('settings.tabs.allergens', 'Allergens') },
    { key: 'tags' as const, label: t('settings.tabs.tags', 'Tags') },
    { key: 'notifications' as const, label: t('settings.tabs.notifications', 'Notifications') },
    ...(loyaltyEnabled ? [{ key: 'loyalty' as const, label: t('settings.tabs.loyalty', 'Loyalty') }] : []),
    ...(isOwner ? [{ key: 'subscription' as const, label: t('settings.tabs.subscription', 'Subscription') }] : []),
    ...(isOwner ? [{ key: 'billing' as const, label: t('settings.tabs.billing', 'Billing') }] : []),
    ...(isOwner ? [{ key: 'integrations' as const, label: t('settings.tabs.integrations', 'Integrations') }] : []),
  ];

  return (
    <Page>
      <PageHeader title={t('nav.settings')} />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'units' && <UnitsTab />}
        {activeTab === 'allergens' && <AllergensTab />}
        {activeTab === 'tags' && <TagsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'loyalty' && loyaltyEnabled && <LoyaltyTab />}
        {activeTab === 'subscription' && isOwner && <SubscriptionTab />}
        {activeTab === 'billing' && isOwner && <BillingTab />}
        {activeTab === 'integrations' && isOwner && <IntegrationsTab />}
      </div>
    </Page>
  );
}
