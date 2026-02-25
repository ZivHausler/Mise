import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

interface FilterDropdownProps {
  label: string;
  count: number;
  children: React.ReactNode;
}

export function FilterDropdown({ label, count, children }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-body-sm font-medium transition-colors ${count > 0 ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
      >
        <Filter className="h-3.5 w-3.5" />
        {label}
        {count > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[11px] font-semibold text-white">
            {count}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute start-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

interface FilterOptionProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function FilterOption({ selected, onClick, children }: FilterOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${selected ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-50'}`}
    >
      {children}
    </button>
  );
}
