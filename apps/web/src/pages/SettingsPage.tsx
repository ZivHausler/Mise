import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader } from '@/components/Layout';
import Tabs from '@/components/Tabs';
import UnitsTab from '@/components/settings/UnitsTab';
import GroupsTab from '@/components/settings/GroupsTab';
import AccountTab from '@/components/settings/AccountTab';
import NotificationsTab from '@/components/settings/NotificationsTab';

type SettingsTabKey = 'units' | 'groups' | 'account' | 'notifications';

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('account');

  const tabs = [
    { key: 'account' as const, label: t('settings.tabs.account', 'Account') },
    { key: 'units' as const, label: t('settings.tabs.units', 'Units') },
    { key: 'groups' as const, label: t('settings.tabs.groups', 'Groups') },
    { key: 'notifications' as const, label: t('settings.tabs.notifications', 'Notifications') },
  ];

  return (
    <Page>
      <PageHeader title={t('nav.settings')} />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'units' && <UnitsTab />}
        {activeTab === 'groups' && <GroupsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </div>
    </Page>
  );
}
