import React, { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldWrapper } from '@/components/FormFields';

export interface BirthdayValue {
  day: number;
  month: number;
}

interface BirthdayInputProps {
  value: BirthdayValue | null;
  onChange: (value: BirthdayValue | null) => void;
  error?: string;
}

const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MONTH_NAMES_EN = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_HE = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export const BirthdayInput = React.memo(function BirthdayInput({ value, onChange, error }: BirthdayInputProps) {
  const { t, i18n } = useTranslation();
  const monthRef = useRef<HTMLInputElement>(null);

  const dayStr = value?.day ? String(value.day) : '';
  const monthStr = value?.month ? String(value.month) : '';

  const handleDayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
      if (raw === '') {
        onChange(value?.month ? { day: 0, month: value.month } : null);
        return;
      }
      const day = Number(raw);
      if (day > 31) return;
      const newVal = { day, month: value?.month ?? 0 };
      onChange(newVal);
      // Auto-advance to month field after 2 digits
      if (raw.length === 2 && monthRef.current) {
        monthRef.current.focus();
      }
    },
    [value, onChange],
  );

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
      if (raw === '') {
        onChange(value?.day ? { day: value.day, month: 0 } : null);
        return;
      }
      const month = Number(raw);
      if (month > 12) return;
      const newVal = { day: value?.day ?? 0, month };
      // Clamp day to valid range for the month
      const maxDay = DAYS_IN_MONTH[month] ?? 31;
      if (newVal.day > 0 && month > 0 && newVal.day > maxDay) {
        newVal.day = maxDay;
      }
      onChange(newVal);
    },
    [value, onChange],
  );

  // Locale-formatted preview
  const monthNames = i18n.language === 'he' ? MONTH_NAMES_HE : MONTH_NAMES_EN;
  const preview =
    value?.day && value?.month
      ? i18n.language === 'he'
        ? `${value.day} ב${monthNames[value.month]}`
        : `${monthNames[value.month]} ${value.day}`
      : null;

  const inputClass =
    'h-10 w-20 rounded-md border bg-white px-3 text-center text-body text-neutral-900 placeholder:text-neutral-400 transition-colors duration-fast focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none border-neutral-200 hover:border-neutral-300';

  return (
    <FieldWrapper label={t('customers.birthday', 'Birthday')} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          placeholder={t('customers.birthdayDay', 'Day')}
          value={dayStr}
          onChange={handleDayChange}
          maxLength={2}
          className={inputClass}
          aria-label={t('customers.birthdayDay', 'Day')}
        />
        <span className="text-neutral-400">/</span>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          dir="ltr"
          placeholder={t('customers.birthdayMonth', 'Month')}
          value={monthStr}
          onChange={handleMonthChange}
          maxLength={2}
          className={inputClass}
          aria-label={t('customers.birthdayMonth', 'Month')}
        />
        {preview && (
          <span className="text-body-sm text-neutral-500">{preview}</span>
        )}
      </div>
    </FieldWrapper>
  );
});
