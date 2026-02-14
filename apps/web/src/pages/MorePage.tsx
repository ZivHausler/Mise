import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, CreditCard, Settings, ChevronRight } from 'lucide-react';
import { Page, PageHeader } from '@/components/Layout';

const moreItems = [
  { path: '/customers', icon: Users, labelKey: 'nav.customers' },
  { path: '/payments', icon: CreditCard, labelKey: 'nav.payments' },
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
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center justify-between rounded-lg bg-white p-4 text-start shadow-xs transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-primary-500" />
              <span className="text-body font-medium text-neutral-800">{t(item.labelKey)}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 rtl:scale-x-[-1]" />
          </button>
        ))}
      </div>
    </Page>
  );
}
