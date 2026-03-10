import React, { useCallback } from 'react';
import { Menu, Globe, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useUpdateProfile, useSubscription } from '@/api/hooks';
import { languageDir } from '@/utils/language';
import { LANGUAGE_TO_ENUM } from '@/constants/defaults';
import type { Language } from '@/constants/defaults';
import { StoreName } from './StoreName';
import { TrialBadge } from './subscription/TrialBadge';

interface TopBarProps {
  onMenuClick?: () => void;
  showAiChat?: boolean;
}

export const TopBar = React.memo(function TopBar({ onMenuClick, showAiChat }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const toggleAiChat = useAppStore((s) => s.toggleAiChat);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  const { data: subscription } = useSubscription();
  const subData = subscription as any;
  const isTrialing = subData?.status === 'trialing';
  const trialEndsAt = subData?.trialEndsAt;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const toggleLanguage = useCallback(() => {
    const newLang = (i18n.language === 'he' ? 'en' : 'he') as Language;
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
    document.documentElement.dir = languageDir(newLang);
    document.documentElement.lang = newLang;
    updateProfile.mutate({ language: LANGUAGE_TO_ENUM[newLang] });
  }, [i18n, setLanguage, updateProfile]);

  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <StoreName />
      </div>

      <div className="flex items-center gap-3">
        {isTrialing && (
          <TrialBadge
            daysRemaining={trialDaysRemaining}
            compact={false}
            className="hidden sm:inline-flex"
          />
        )}
        {isTrialing && (
          <TrialBadge
            daysRemaining={trialDaysRemaining}
            compact
            className="inline-flex sm:hidden"
          />
        )}
        <button
          onClick={toggleLanguage}
          data-tour="topbar-language"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm text-neutral-600 hover:bg-neutral-100"
        >
          <Globe className="h-4 w-4" />
          {i18n.language === 'he' ? 'EN' : 'HE'}
        </button>

        {showAiChat ? (
          <button
            type="button"
            onClick={toggleAiChat}
            data-tour="topbar-avatar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600"
            aria-label={t('chat.title')}
          >
            <Sparkles className="h-4 w-4" />
          </button>
        ) : user ? (
          <div data-tour="topbar-avatar" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-body-sm font-medium text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        ) : null}
      </div>
    </header>
  );
});
