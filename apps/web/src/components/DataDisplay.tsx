import React, { useMemo, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

// StatusBadge
type BadgeVariant = 'received' | 'in_progress' | 'ready' | 'delivered' | 'cancelled' | 'unpaid' | 'partial' | 'paid' | 'low' | 'ok' | 'good' | 'out' | 'info' | 'success' | 'warning' | 'error';

const badgeStyles: Record<string, string> = {
  received: 'bg-info-light text-info border-info/20',
  in_progress: 'bg-warning-light text-warning border-warning/20',
  ready: 'bg-success-light text-success border-success/20',
  delivered: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  cancelled: 'bg-error-light text-error border-error/20',
  unpaid: 'bg-error-light text-error border-error/20',
  partial: 'bg-warning-light text-warning border-warning/20',
  paid: 'bg-success-light text-success border-success/20',
  low: 'bg-warning-light text-warning-dark border-warning/20',
  ok: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  good: 'bg-success-light text-success border-success/20',
  out: 'bg-error-light text-error border-error/20',
  info: 'bg-info-light text-info border-info/20',
  success: 'bg-success-light text-success border-success/20',
  warning: 'bg-warning-light text-warning border-warning/20',
  error: 'bg-error-light text-error border-error/20',
};

const dotStyles: Record<string, string> = {
  received: 'bg-info',
  in_progress: 'bg-warning',
  ready: 'bg-success',
  delivered: 'bg-neutral-500',
  cancelled: 'bg-error',
  unpaid: 'bg-error',
  partial: 'bg-warning',
  paid: 'bg-success',
  low: 'bg-warning',
  ok: 'bg-neutral-400',
  good: 'bg-success',
  out: 'bg-error',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

export const StatusBadge = React.memo(function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-caption font-medium',
        badgeStyles[variant]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />
      {label}
    </span>
  );
});

// StatCard
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  onClick?: () => void;
}

export const StatCard = React.memo(function StatCard({ label, value, icon, trend, onClick }: StatCardProps) {
  return (
    <div className={cn('rounded-lg bg-white p-6 shadow-md', onClick && 'cursor-pointer transition-shadow hover:shadow-lg')} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption text-neutral-500">{label}</p>
          <p className="mt-1 font-mono text-h2 text-neutral-800">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-1 flex items-center gap-1 text-caption font-medium',
                trend.value >= 0 ? 'text-success' : 'text-accent-500'
              )}
            >
              {trend.value >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {Math.abs(trend.value)}%{trend.label && ` ${trend.label}`}
            </p>
          )}
        </div>
        {icon && <div className="text-primary-400">{icon}</div>}
      </div>
    </div>
  );
});

// EmptyState
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = React.memo(function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-neutral-300">{icon}</div>}
      <h3 className="font-heading text-h3 text-neutral-700">{title}</h3>
      {description && <p className="mt-2 max-w-[400px] text-body-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
});

// DataTable
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  shrink?: boolean;
  sticky?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: React.ReactNode;
  bare?: boolean;
  defaultSearch?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  searchable,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  toolbar,
  bare,
  defaultSearch = '',
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(defaultSearch);
  const debouncedSearch = useDebouncedValue(search);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const filteredData = useMemo(() => {
    let result = data;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v).toLowerCase().includes(lower))
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, debouncedSearch, sortKey, sortDir]);

  const alignClass = { start: 'text-start', center: 'text-center', end: 'text-end' };

  return (
    <div className={bare ? '' : 'overflow-hidden rounded-lg border border-neutral-200 bg-white'}>
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-2 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative max-w-xs">
              <Search className="absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder={searchPlaceholder || t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-neutral-200 bg-white ps-9 pe-3 text-body-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-2 text-body-sm font-semibold text-neutral-700',
                    alignClass[col.align || 'start'],
                    col.sortable && 'cursor-pointer select-none hover:text-neutral-900',
                    col.shrink && 'w-px whitespace-nowrap',
                    col.sticky && 'sticky start-0 z-10 bg-neutral-100'
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <EmptyState
                    title={emptyTitle || t('common.noResults')}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              filteredData.map((row, i) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    'group border-b border-neutral-100 transition-colors',
                    i % 2 === 1 && 'bg-neutral-50',
                    onRowClick && 'cursor-pointer hover:bg-primary-50'
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-3 py-2 text-body-sm', alignClass[col.align || 'start'], col.shrink && 'w-px whitespace-nowrap', col.sticky && `sticky start-0 z-10 ${i % 2 === 1 ? 'bg-neutral-50' : 'bg-white'} group-hover:bg-primary-50 transition-colors`)}
                    >
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
