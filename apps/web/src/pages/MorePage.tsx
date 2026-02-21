import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, CreditCard, Settings, Factory, ChevronRight, Sparkles } from 'lucide-react';
import { Page, PageHeader } from '@/components/Layout';
import { useFeatureFlags } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';

const moreItems = [
  { path: '/customers', icon: Users, labelKey: 'nav.customers' },
  { path: '/payments', icon: CreditCard, labelKey: 'nav.payments' },
  { path: '/production', icon: Factory, labelKey: 'nav.production', featureFlag: 'production' as const },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function MorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: featureFlags } = useFeatureFlags();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  return (
    <Page>
      <PageHeader title={t('nav.more', 'More')} />
      <div className="flex flex-col gap-1">
        {moreItems.map((item) => {
          const isLocked = item.featureFlag && !featureFlags?.[item.featureFlag] && !isAdmin;
          if (isLocked) {
            return (
              <div
                key={item.path}
                className="flex items-center justify-between rounded-lg bg-white p-4 opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-neutral-400" />
                  <span className="text-body font-medium text-neutral-500">{t(item.labelKey)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-purple-400">
                    {t('nav.comingSoon')}
                  </span>
                </div>
              </div>
            );
          }
          return (
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
          );
        })}
      </div>
    </Page>
  );
}
