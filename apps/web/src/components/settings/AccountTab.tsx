import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Save, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Section, Stack } from '@/components/Layout';
import { TextInput, Select, Toggle } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { useProfile, useUpdateProfile, useUpdateStoreTheme } from '@/api/hooks';
import { DATE_FORMATS, TIME_FORMATS, LANGUAGES, WEEK_START_DAYS, LANGUAGE_TO_ENUM, ENUM_TO_LANGUAGE, APP_THEMES, THEME_PRESETS, STORE_ROLES, applyThemePalette } from '@/constants/defaults';
import { languageDir } from '@/utils/language';
import type { DateFormat, TimeFormat, Language, WeekStartDay, AppTheme } from '@/constants/defaults';

export default function AccountTab() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const dateFormat = useAppStore((s) => s.dateFormat);
  const setDateFormat = useAppStore((s) => s.setDateFormat);
  const timeFormat = useAppStore((s) => s.timeFormat);
  const setTimeFormat = useAppStore((s) => s.setTimeFormat);
  const weekStartDay = useAppStore((s) => s.weekStartDay);
  const setWeekStartDay = useAppStore((s) => s.setWeekStartDay);
  const showFriday = useAppStore((s) => s.showFriday);
  const setShowFriday = useAppStore((s) => s.setShowFriday);
  const showSaturday = useAppStore((s) => s.showSaturday);
  const setShowSaturday = useAppStore((s) => s.setShowSaturday);

  const authUser = useAuthStore((s) => s.user);
  const stores = useAuthStore((s) => s.stores);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const updateTheme = useUpdateStoreTheme();

  const activeStore = stores.find((s) => String(s.storeId) === String(activeStoreId)) ?? stores[0];
  const currentTheme = (activeStore?.store?.theme as AppTheme) || 'cream';
  const isOwnerOrAdmin = activeStore?.role === STORE_ROLES.OWNER || isAdmin;

  const initLanguageFromProfile = useAppStore((s) => s.initLanguageFromProfile);
  const p = profile as { id: number; email: string; name: string; phone?: string; language: number } | undefined;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (p) {
      setName(p.name);
      setPhone(p.phone || '');
      setDirty(false);
      // Initialize language from DB profile
      const lang = ENUM_TO_LANGUAGE[p.language] ?? 'he';
      i18n.changeLanguage(lang);
      initLanguageFromProfile(p.language);
      document.documentElement.dir = languageDir(lang);
      document.documentElement.lang = lang;
    }
  }, [p, i18n, initLanguageFromProfile]);

  const validatePhone = (value: string): boolean => {
    if (!value) return true;
    if (!/^05\d{8}$/.test(value)) {
      setPhoneError(t('settings.account.phoneError', 'Invalid phone number — e.g. 0541234567'));
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSave = () => {
    if (!validatePhone(phone)) return;
    const payload: Record<string, unknown> = {};
    if (name !== p?.name) payload.name = name;
    if (phone !== (p?.phone || '')) payload.phone = phone || null;
    if (Object.keys(payload).length > 0) {
      updateProfile.mutate(payload, { onSuccess: () => setDirty(false) });
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setDirty(true);
  };

  const languageOptions = LANGUAGES.map((lng) => ({
    value: lng,
    label: t(`settings.languages.${lng}`, lng),
  }));

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLang = e.target.value as Language;
      i18n.changeLanguage(newLang);
      setLanguage(newLang);
      document.documentElement.dir = languageDir(newLang);
      document.documentElement.lang = newLang;
      const enumValue = LANGUAGE_TO_ENUM[newLang];
      if (enumValue !== undefined) {
        updateProfile.mutate({ language: enumValue });
      }
    },
    [i18n, setLanguage, updateProfile],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={6}>
      <Card>
        <Section title={t('settings.profile', 'Profile')}>
          <Stack gap={3}>
            <TextInput label={t('auth.email')} value={p?.email ?? authUser?.email ?? ''} disabled />
            <TextInput label={t('auth.name')} value={name} onChange={handleFieldChange(setName)} />
            <TextInput label={t('settings.account.phone', 'Phone')} value={phone} onChange={(e) => { handleFieldChange(setPhone)(e); setPhoneError(''); }} error={phoneError} dir="ltr" />
            {dirty && (
              <div className="flex justify-center pt-3">
                <Button variant="primary" size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSave} loading={updateProfile.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            )}
          </Stack>
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.preferences', 'Preferences')}>
          <Stack gap={3}>
            <Select
              label={t('settings.language', 'Language')}
              options={languageOptions}
              value={i18n.language}
              onChange={handleLanguageChange}
            />
            <Select
              label={t('settings.dateFormat', 'Date Format')}
              options={DATE_FORMATS.map((f) => ({ value: f, label: f }))}
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value as DateFormat)}
            />
            <Select
              label={t('settings.timeFormat', 'Time Format')}
              options={TIME_FORMATS.map((f) => ({
                value: f,
                label: f === '24h' ? t('settings.timeFormats.24h', '24h (14:30)') : t('settings.timeFormats.12h', '12h (2:30 PM)'),
              }))}
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
            />
            <Select
              label={t('settings.weekStartDay', 'Week starts on')}
              options={WEEK_START_DAYS.map((d) => ({
                value: d,
                label: t(`settings.weekStartDays.${d}`, d),
              }))}
              value={weekStartDay}
              onChange={(e) => setWeekStartDay(e.target.value as WeekStartDay)}
            />
            <Toggle
              label={t('settings.showFriday', 'Show Friday')}
              checked={showFriday}
              onChange={setShowFriday}
            />
            <Toggle
              label={t('settings.showSaturday', 'Show Saturday')}
              checked={showSaturday}
              onChange={setShowSaturday}
            />
          </Stack>
        </Section>
      </Card>

      {isOwnerOrAdmin && (
        <Card>
          <Section title={t('settings.appearance', 'Appearance')}>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {APP_THEMES.map((theme) => (
                <ThemeOption
                  key={theme}
                  theme={theme}
                  selected={theme === currentTheme}
                  onClick={() => {
                    updateTheme.mutate({ theme });
                    applyThemePalette(theme);
                    const updatedStores = stores.map((s) =>
                      String(s.storeId) === String(activeStoreId) ? { ...s, store: { ...s.store, theme } } : s,
                    );
                    useAuthStore.getState().setStores(updatedStores);
                  }}
                />
              ))}
            </div>
          </Section>
        </Card>
      )}

      <Card>
        <Section title={t('settings.account.title', 'Account')}>
          <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
            {t('auth.logout')}
          </Button>
        </Section>
      </Card>
    </Stack>
  );
}

function ThemeOption({ theme, selected, onClick }: { theme: AppTheme; selected: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const { nameKey, colors } = THEME_PRESETS[theme];

  return (
    <button type="button" className="flex flex-col items-center gap-1" onClick={onClick}>
      <div
        className={`relative w-full aspect-[3/2] rounded-md overflow-hidden border transition-all ${
          selected ? 'ring-2 ring-primary-500 border-primary-500' : 'border-neutral-200 hover:border-neutral-300'
        }`}
      >
        <div className="absolute inset-y-0 start-0 w-3.5 flex flex-col items-center gap-0.5 pt-2" style={{ backgroundColor: colors['900'] }}>
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>
        <div className="absolute inset-y-0 start-3.5 end-0 flex flex-col gap-0.5 p-1.5" style={{ backgroundColor: colors['50'] }}>
          <div className="w-full h-3 rounded-sm bg-white shadow-sm" />
          <div className="flex gap-0.5 mt-auto">
            <div className="w-5 h-2 rounded-full" style={{ backgroundColor: colors['500'], opacity: 0.7 }} />
            <div className="w-5 h-2 rounded-full" style={{ backgroundColor: colors['500'], opacity: 0.4 }} />
          </div>
        </div>
        {selected && (
          <div className="absolute top-0.5 end-0.5 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>
      <span className="text-[11px] text-neutral-600 font-medium">
        {t(nameKey, theme.charAt(0).toUpperCase() + theme.slice(1))}
      </span>
    </button>
  );
}
