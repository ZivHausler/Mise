import React from 'react';
import { useTranslation } from 'react-i18next';

interface DateFilterDropdownProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export function DateFilterDropdown({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateFilterDropdownProps) {
  const { t } = useTranslation();

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-body-sm font-semibold text-neutral-700">{t('common.from')}</span>
        <input
          type="date"
          className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-body-sm font-semibold text-neutral-700">{t('common.to')}</span>
        <input
          type="date"
          className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-700"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </label>
    </>
  );
}
