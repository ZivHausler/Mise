import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, Card, Section, Stack } from '@/components/Layout';
import { Toggle } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const user = useAuthStore((s) => s.user);

  const isHebrew = i18n.language === 'he';

  const handleLanguageToggle = useCallback(
    (checked: boolean) => {
      const newLang = checked ? 'he' : 'en';
      i18n.changeLanguage(newLang);
      setLanguage(newLang);
      document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
    },
    [i18n, setLanguage]
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <Page>
      <PageHeader title={t('nav.settings')} />

      <Stack gap={6}>
        {user && (
          <Card>
            <Section title={t('settings.profile', 'Profile')}>
              <Stack gap={2}>
                <div className="flex justify-between text-body-sm">
                  <span className="text-neutral-500">{t('auth.name')}</span>
                  <span className="font-medium text-neutral-800">{user.name}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-neutral-500">{t('auth.email')}</span>
                  <span className="font-medium text-neutral-800" dir="ltr">{user.email}</span>
                </div>
              </Stack>
            </Section>
          </Card>
        )}

        <Card>
          <Section title={t('settings.preferences', 'Preferences')}>
            <Toggle
              label={`${t('settings.language', 'Language')}: ${isHebrew ? 'עברית' : 'English'}`}
              checked={isHebrew}
              onChange={handleLanguageToggle}
            />
          </Section>
        </Card>

        <Card>
          <Section title={t('settings.account', 'Account')}>
            <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
              {t('auth.logout')}
            </Button>
          </Section>
        </Card>
      </Stack>
    </Page>
  );
}
