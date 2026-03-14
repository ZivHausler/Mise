import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Section, Stack } from '@/components/Layout';
import { Select, Toggle } from '@/components/FormFields';
import { useAppStore } from '@/store/app';
import { useUpdateProfile } from '@/api/hooks';
import { DATE_FORMATS, TIME_FORMATS, LANGUAGES, WEEK_START_DAYS, LANGUAGE_TO_ENUM } from '@/constants/defaults';
import { languageDir } from '@/utils/language';
import type { DateFormat, TimeFormat, Language, WeekStartDay } from '@/constants/defaults';

export default function PreferencesTab() {
  const { t, i18n } = useTranslation();
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

  const updateProfile = useUpdateProfile();

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

  return (
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
  );
}
