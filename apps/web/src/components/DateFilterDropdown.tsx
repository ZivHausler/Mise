import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, ChevronDown } from 'lucide-react';

interface DateFilterDropdownProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export function DateFilterDropdown({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateFilterDropdownProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const count = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  const panelWidth = 220;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const [panelSide, setPanelSide] = useState<'left' | 'right'>('left');

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.left;
      const spaceLeft = rect.right;
      // Open toward whichever physical side has more room
      setPanelSide(spaceRight >= panelWidth ? 'left' : spaceLeft >= panelWidth ? 'right' : 'left');
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-body-sm font-medium transition-colors ${count > 0 ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
      >
        <Filter className="h-3.5 w-3.5" />
        {t('admin.auditLog.date', 'Date')}
        {count > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[11px] font-semibold text-white">
            {count}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full z-20 mt-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg ${panelSide === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="space-y-2 p-2" style={{ minWidth: 200 }}>
            <div>
              <label className="text-caption font-medium text-neutral-500">{t('common.from')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-body-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="text-caption font-medium text-neutral-500">{t('common.to')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-body-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
