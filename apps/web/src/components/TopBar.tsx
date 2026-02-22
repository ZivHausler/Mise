import React, { useCallback } from 'react';
import { Menu, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useUpdateProfile } from '@/api/hooks';
import { languageDir } from '@/utils/language';
import { LANGUAGE_TO_ENUM } from '@/constants/defaults';
import type { Language } from '@/constants/defaults';
import { StoreName } from './StoreName';

interface TopBarProps {
  onMenuClick?: () => void;
}

export const TopBar = React.memo(function TopBar({ onMenuClick }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
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
        <button
          onClick={toggleLanguage}
          data-tour="topbar-language"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm text-neutral-600 hover:bg-neutral-100"
        >
          <Globe className="h-4 w-4" />
          {i18n.language === 'he' ? 'EN' : 'HE'}
        </button>

        {user && (
          <div data-tour="topbar-avatar" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-body-sm font-medium text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
});
