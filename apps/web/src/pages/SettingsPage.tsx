import React from 'react';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader } from '@/components/Layout';
import Tabs from '@/components/Tabs';
import UnitsTab from '@/components/settings/UnitsTab';
import GroupsTab from '@/components/settings/GroupsTab';
import AccountTab from '@/components/settings/AccountTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import TeamTab from '@/components/settings/TeamTab';
import LoyaltyTab from '@/components/settings/LoyaltyTab';
import { useAppStore } from '@/store/app';

export default function SettingsPage() {
  const { t } = useTranslation();
  const activeTab = useAppStore((s) => s.settingsTab);
  const setActiveTab = useAppStore((s) => s.setSettingsTab);

  const tabs = [
    { key: 'account' as const, label: t('settings.tabs.account', 'Account') },
    { key: 'team' as const, label: t('settings.tabs.team', 'Team') },
    { key: 'units' as const, label: t('settings.tabs.units', 'Units') },
    { key: 'groups' as const, label: t('settings.tabs.groups', 'Groups') },
    { key: 'notifications' as const, label: t('settings.tabs.notifications', 'Notifications') },
    { key: 'loyalty' as const, label: t('settings.tabs.loyalty', 'Loyalty') },
  ];

  return (
    <Page>
      <PageHeader title={t('nav.settings')} />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'units' && <UnitsTab />}
        {activeTab === 'groups' && <GroupsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'loyalty' && <LoyaltyTab />}
      </div>
    </Page>
  );
}
