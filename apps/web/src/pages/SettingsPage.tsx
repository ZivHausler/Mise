import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader } from '@/components/Layout';
import Tabs from '@/components/Tabs';
import ProfileTab from '@/components/settings/ProfileTab';
import PreferencesTab from '@/components/settings/PreferencesTab';
import AppearanceTab from '@/components/settings/AppearanceTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import TeamTab from '@/components/settings/TeamTab';
import UnitsTab from '@/components/settings/UnitsTab';
import AllergensTab from '@/components/settings/AllergensTab';
import TagsTab from '@/components/settings/TagsTab';
import CategoriesTab from '@/components/settings/CategoriesTab';
import LoyaltyTab from '@/components/settings/LoyaltyTab';
import IntegrationsTab from '@/components/settings/IntegrationsTab';
import BillingTab from '@/components/settings/BillingTab';
import SubscriptionTab from '@/components/settings/SubscriptionTab';
import StorefrontTab from '@/components/settings/StorefrontTab';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useFeatureFlags } from '@/api/hooks';
import { STORE_ROLES } from '@/constants/defaults';
import { cn } from '@/utils/cn';
import type { SettingsSection } from '@/store/app';

export default function SettingsPage() {
  const { t } = useTranslation();
  const settingsSection = useAppStore((s) => s.settingsSection);
  const setSettingsSection = useAppStore((s) => s.setSettingsSection);
  const activeTab = useAppStore((s) => s.settingsTab);
  const setActiveTab = useAppStore((s) => s.setSettingsTab);
  const stores = useAuthStore((s) => s.stores);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const { data: featureFlags } = useFeatureFlags();

  const activeRole = stores.find((s) => String(s.storeId) === String(activeStoreId))?.role;
  const isOwnerOrAdmin = activeRole === STORE_ROLES.OWNER || isAdmin;
  const loyaltyEnabled = featureFlags?.loyalty ?? false;

  const personalTabs = [
    { key: 'profile' as const, label: t('settings.tabs.profile', 'Profile') },
    { key: 'preferences' as const, label: t('settings.tabs.preferences', 'Preferences') },
    { key: 'notifications' as const, label: t('settings.tabs.notifications', 'Notifications') },
  ];

  const storeTabs = [
    ...(isOwnerOrAdmin ? [{ key: 'businessDetails' as const, label: t('settings.tabs.businessDetails', 'Business Details') }] : []),
    ...(isOwnerOrAdmin ? [{ key: 'appearance' as const, label: t('settings.tabs.appearance', 'Appearance') }] : []),
    { key: 'team' as const, label: t('settings.tabs.team', 'Team') },
    { key: 'defaults' as const, label: t('settings.tabs.defaults', 'Defaults') },
    ...(loyaltyEnabled ? [{ key: 'loyalty' as const, label: t('settings.tabs.loyalty', 'Loyalty') }] : []),
    ...(isOwnerOrAdmin ? [{ key: 'subscription' as const, label: t('settings.tabs.subscription', 'Subscription') }] : []),
    ...(isOwnerOrAdmin ? [{ key: 'integrations' as const, label: t('settings.tabs.integrations', 'Integrations') }] : []),
    ...(isOwnerOrAdmin ? [{ key: 'storefront' as const, label: t('settings.tabs.storefront', 'Storefront') }] : []),
  ];

  // Non-owners only see personal settings
  const effectiveSection = isOwnerOrAdmin ? settingsSection : 'personal';
  const activeTabs = effectiveSection === 'personal' ? personalTabs : storeTabs;
  const safeActiveTab = activeTabs.find((tab) => tab.key === activeTab)?.key ?? activeTabs[0]?.key ?? 'profile';

  return (
    <Page>
      <PageHeader title={t('nav.settings')} />

      {isOwnerOrAdmin && <SectionSelector section={effectiveSection} onChange={setSettingsSection} />}

      <Tabs tabs={activeTabs} activeTab={safeActiveTab} onChange={setActiveTab} />

      <div className="mt-6">
        {effectiveSection === 'personal' && (
          <>
            {safeActiveTab === 'profile' && <ProfileTab />}
            {safeActiveTab === 'preferences' && <PreferencesTab />}
            {safeActiveTab === 'notifications' && <NotificationsTab />}
          </>
        )}
        {effectiveSection === 'store' && (
          <>
            {safeActiveTab === 'appearance' && isOwnerOrAdmin && <AppearanceTab />}
            {safeActiveTab === 'team' && <TeamTab />}
            {safeActiveTab === 'defaults' && <DefaultsPanel />}
            {safeActiveTab === 'loyalty' && loyaltyEnabled && <LoyaltyTab />}
            {safeActiveTab === 'subscription' && isOwnerOrAdmin && <SubscriptionTab />}
            {safeActiveTab === 'businessDetails' && isOwnerOrAdmin && <BillingTab />}
            {safeActiveTab === 'integrations' && isOwnerOrAdmin && <IntegrationsTab />}
            {safeActiveTab === 'storefront' && isOwnerOrAdmin && <StorefrontTab />}
          </>
        )}
      </div>
    </Page>
  );
}

type DefaultsSubTab = 'units' | 'allergens' | 'tags' | 'categories';

function DefaultsPanel() {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<DefaultsSubTab>('units');

  const subTabs = [
    { key: 'units' as const, label: t('settings.tabs.units', 'Units') },
    { key: 'allergens' as const, label: t('settings.tabs.allergens', 'Allergens') },
    { key: 'tags' as const, label: t('settings.tabs.tags', 'Tags') },
    { key: 'categories' as const, label: t('settings.tabs.categories', 'Categories') },
  ];

  return (
    <div>
      <Tabs tabs={subTabs} activeTab={subTab} onChange={setSubTab} />
      <div className="mt-4">
        {subTab === 'units' && <UnitsTab />}
        {subTab === 'allergens' && <AllergensTab />}
        {subTab === 'tags' && <TagsTab />}
        {subTab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
}

function SectionSelector({
  section,
  onChange,
}: {
  section: SettingsSection;
  onChange: (s: SettingsSection) => void;
}) {
  const { t } = useTranslation();
  const sections: { key: SettingsSection; label: string }[] = [
    { key: 'personal', label: t('settings.sections.personal', 'Personal') },
    { key: 'store', label: t('settings.sections.store', 'Store') },
  ];

  return (
    <div className="flex justify-center mb-6">
      <div className="inline-flex items-center gap-1 bg-neutral-100 rounded-xl p-1 w-full sm:w-auto">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            className={cn(
              'flex-1 sm:flex-none px-6 py-2 rounded-lg text-body-sm font-medium transition-all',
              section === s.key
                ? 'font-semibold text-primary-700 bg-white shadow-sm ring-1 ring-neutral-200'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
