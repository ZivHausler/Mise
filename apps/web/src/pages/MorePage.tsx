import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, CreditCard, FileText, Settings, Factory } from 'lucide-react';
import { NavItem } from '@/components/NavItem';
import { Page, PageHeader } from '@/components/Layout';

const moreItems = [
  { path: '/customers', icon: Users, labelKey: 'nav.customers', featureFlag: 'customers' as const },
  { path: '/payments', icon: CreditCard, labelKey: 'nav.payments', featureFlag: 'payments' as const },
  { path: '/invoices', icon: FileText, labelKey: 'nav.invoices', featureFlag: 'invoices' as const },
  { path: '/production', icon: Factory, labelKey: 'nav.production', featureFlag: 'production' as const },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function MorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Page>
      <PageHeader title={t('nav.more', 'More')} />
      <div className="flex flex-col gap-1">
        {moreItems.map((item) => (
          <NavItem
            key={item.path}
            path={item.path}
            icon={item.icon}
            labelKey={item.labelKey}
            featureFlag={item.featureFlag}
            variant="more"
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </Page>
  );
}
