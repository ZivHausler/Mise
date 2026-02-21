import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCalendarAggregates, useCalendarRange } from '@/api/hooks';
import { getStatusLabel } from '@/utils/orderStatus';
import { useFormatDate } from '@/utils/dateFormat';
import { StatusBadge } from '@/components/DataDisplay';
import { Spinner } from '@/components/Feedback';
import { Button } from '@/components/Button';
import { NewOrderModal } from '@/components/NewOrderModal';
import { useAppStore } from '@/store/app';
import type { WeekStartDay } from '@/constants/defaults';

// ─── Helpers ───────────────────────────────────────────

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const last = new Date(year, month + 1, 0);
  const to = toDateString(last);
  return { from, to };
}

function getCalendarDays(year: number, month: number, weekStartDay: WeekStartDay): Date[] {
  const firstDay = new Date(year, month, 1);

  // Calculate start offset based on week start preference
  const startOffset = weekStartDay === 'monday'
    ? (firstDay.getDay() + 6) % 7  // Monday = 0
    : firstDay.getDay();            // Sunday = 0

  const start = new Date(year, month, 1 - startOffset);

  const days: Date[] = [];
  const current = new Date(start);

  // Always show 6 weeks (42 days) for consistent height
  while (days.length < 42) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/** Day-of-week index (0=Sun … 6=Sat) for each key */
const WEEKDAY_DOW: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function getWeekdayKeys(weekStartDay: WeekStartDay, showFriday: boolean, showSaturday: boolean): string[] {
  const all = weekStartDay === 'monday'
    ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    : ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return all.filter((d) => {
    if (d === 'fri' && !showFriday) return false;
    if (d === 'sat' && !showSaturday) return false;
    return true;
  });
}

function getHiddenDows(showFriday: boolean, showSaturday: boolean): Set<number> {
  const hidden = new Set<number>();
  if (!showFriday) hidden.add(5);
  if (!showSaturday) hidden.add(6);
  return hidden;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const STATUS_DOT_COLORS: Record<string, string> = {
  received: 'bg-info',
  in_progress: 'bg-warning',
  ready: 'bg-success',
  delivered: 'bg-neutral-400',
};

// ─── Types ─────────────────────────────────────────────

interface OrderForCalendar {
  id: number;
  orderNumber: number;
  customerName?: string;
  status: number;
  dueDate: string;
  totalAmount: number;
  items: { recipeId: string; recipeName?: string; quantity: number }[];
}

// ─── Day Cell ──────────────────────────────────────────

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  orders: OrderForCalendar[];
  onOrderClick: (id: number) => void;
  onDayClick: (date: Date) => void;
  t: ReturnType<typeof useTranslation>['t'];
}

const MAX_VISIBLE_ORDERS = 3;

const DayCell = React.memo(function DayCell({ date, isCurrentMonth, isToday, orders, onOrderClick, onDayClick, t }: DayCellProps) {
  const overdue = orders.filter((o) => o.status < 2 && new Date(o.dueDate) < new Date() && !isSameDay(new Date(o.dueDate), new Date()));
  const hasOverdue = overdue.length > 0;

  return (
    <div
      onClick={() => onDayClick(date)}
      className={cn(
        'group relative min-h-[100px] cursor-pointer border border-neutral-100 p-1.5 transition-colors hover:bg-primary-50/50',
        !isCurrentMonth && 'bg-neutral-50/60 opacity-50',
        isToday && 'bg-blue-50/60 ring-2 ring-inset ring-blue-400',
        hasOverdue && isCurrentMonth && 'bg-red-50/30',
      )}
    >
      {/* Date number */}
      <div className="mb-1 flex items-center justify-between">
        <span
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-caption font-semibold',
            isToday && 'bg-blue-600 text-white',
            !isToday && isCurrentMonth && 'text-neutral-700',
            !isToday && !isCurrentMonth && 'text-neutral-400',
          )}
        >
          {date.getDate()}
        </span>
        {isToday && (
          <span className="text-[10px] font-semibold text-blue-600">
            {t('calendar.today', 'Today')}
          </span>
        )}
        {!isToday && orders.length > 0 && (
          <span className="text-[10px] font-medium text-neutral-400">
            {orders.length}
          </span>
        )}
      </div>

      {/* Order cards */}
      <div className="flex flex-col gap-0.5">
        {orders.slice(0, MAX_VISIBLE_ORDERS).map((order) => {
          const label = getStatusLabel(order.status);
          return (
            <button
              key={String(order.id)}
              onClick={(e) => { if (orders.length === 1) { e.stopPropagation(); onOrderClick(order.id); } }}
              className={cn(
                'flex w-full items-center gap-1 rounded px-1 py-0.5 text-start text-[11px] leading-tight transition-colors hover:bg-white/80',
                orders.length === 1 && 'cursor-pointer',
              )}
            >
              <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_COLORS[label])} />
              <span className="truncate font-medium text-neutral-700">#{order.orderNumber}</span>
              <span className="hidden truncate text-neutral-500 sm:inline">{order.customerName}</span>
            </button>
          );
        })}
        {orders.length > MAX_VISIBLE_ORDERS && (
          <span className="px-1 text-[10px] font-medium text-primary-600">
            +{orders.length - MAX_VISIBLE_ORDERS} {t('calendar.more', 'more')}
          </span>
        )}
      </div>
    </div>
  );
});

// ─── Day Detail Modal ──────────────────────────────────

interface DayDetailProps {
  date: Date;
  orders: OrderForCalendar[];
  onClose: () => void;
  onOrderClick: (id: number) => void;
  onCreateOrder: (dateStr: string) => void;
  t: ReturnType<typeof useTranslation>['t'];
  formatDate: (date: string | Date) => string;
}

function DayDetail({ date, orders, onClose, onOrderClick, onCreateOrder, t, formatDate }: DayDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-4 max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <div>
            <h3 className="text-body font-semibold text-neutral-800">{formatDate(date)}</h3>
            <p className="text-caption text-neutral-500">
              {orders.length} {t('calendar.orders', 'orders')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => onCreateOrder(toDateString(date))}
          >
            {t('orders.create', 'New Order')}
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-caption text-neutral-400">{t('calendar.noOrders', 'No orders for this day')}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {orders.map((order) => {
                const label = getStatusLabel(order.status);
                return (
                  <button
                    key={String(order.id)}
                    onClick={() => onOrderClick(order.id)}
                    className="flex items-center justify-between rounded-lg border border-neutral-100 p-3 text-start transition-colors hover:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-800">#{order.orderNumber}</span>
                        <StatusBadge variant={label as any} label={t(`orders.status.${label}`, label)} />
                      </div>
                      <p className="mt-0.5 truncate text-caption text-neutral-500">{order.customerName}</p>
                      {order.items?.length > 0 && (
                        <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                          {order.items.slice(0, 2).map((i) => `${i.recipeName || i.recipeId} x${i.quantity}`).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2}`}
                        </p>
                      )}
                    </div>
                    <span className="ms-3 whitespace-nowrap font-mono text-caption text-neutral-600">
                      {order.totalAmount ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Month Picker Overlay ──────────────────────────────

interface MonthPickerProps {
  year: number;
  month: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
  language: string;
}

function MonthPicker({ year, month, onSelect, onClose, language }: MonthPickerProps) {
  const [pickerYear, setPickerYear] = useState(year);
  const now = new Date();
  // Allow up to 2 months ahead of today
  const maxDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const maxYear = maxDate.getFullYear();
  const maxMonth = maxDate.getMonth();
  // Allow up to 12 months ago
  const minDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const minYear = minDate.getFullYear();
  const minMonth = minDate.getMonth();

  const isDisabled = (m: number) =>
    pickerYear > maxYear || (pickerYear === maxYear && m > maxMonth) ||
    pickerYear < minYear || (pickerYear === minYear && m < minMonth);

  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(pickerYear, i).toLocaleDateString(language, { month: 'short' }),
    );
  }, [pickerYear, language]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-full z-50 mt-1 w-64 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl"
      >
        {/* Year navigation */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setPickerYear((y) => y - 1)}
            disabled={pickerYear <= minYear}
            className={cn(
              'rounded-md p-1 text-neutral-500 hover:bg-neutral-100',
              pickerYear <= minYear && 'pointer-events-none opacity-30',
            )}
          >
            <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
          </button>
          <span className="text-sm font-semibold text-neutral-800">{pickerYear}</span>
          <button
            onClick={() => setPickerYear((y) => y + 1)}
            disabled={pickerYear >= maxYear}
            className={cn(
              'rounded-md p-1 text-neutral-500 hover:bg-neutral-100',
              pickerYear >= maxYear && 'pointer-events-none opacity-30',
            )}
          >
            <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-1">
          {monthNames.map((name, i) => {
            const disabled = isDisabled(i);
            const selected = pickerYear === year && i === month;
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => { onSelect(pickerYear, i); onClose(); }}
                className={cn(
                  'rounded-lg px-1 py-2 text-xs font-medium transition-colors',
                  selected && 'bg-primary-600 text-white',
                  !selected && !disabled && 'text-neutral-700 hover:bg-neutral-100',
                  disabled && 'cursor-not-allowed text-neutral-300',
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Main Calendar ─────────────────────────────────────

export default function OrderCalendar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const weekStartDay = useAppStore((s) => s.weekStartDay);
  const showFriday = useAppStore((s) => s.showFriday);
  const showSaturday = useAppStore((s) => s.showSaturday);

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [newOrderDate, setNewOrderDate] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { from, to } = useMemo(() => getMonthRange(year, month), [year, month]);
  const { data: aggregates, isLoading: aggsLoading, isFetching: aggsFetching } = useCalendarAggregates(from, to);
  const { data: orders, isLoading: ordersLoading, isFetching: ordersFetching } = useCalendarRange(from, to, statusFilter);

  const isLoading = aggsLoading || ordersLoading;
  const isFetching = aggsFetching || ordersFetching;

  const weekdayKeys = useMemo(() => getWeekdayKeys(weekStartDay, showFriday, showSaturday), [weekStartDay, showFriday, showSaturday]);
  const hiddenDows = useMemo(() => getHiddenDows(showFriday, showSaturday), [showFriday, showSaturday]);
  const allCalendarDays = useMemo(() => getCalendarDays(year, month, weekStartDay), [year, month, weekStartDay]);
  const calendarDays = useMemo(() => allCalendarDays.filter((d) => !hiddenDows.has(d.getDay())), [allCalendarDays, hiddenDows]);
  const visibleColCount = weekdayKeys.length;

  // Mobile: fixed 24vw per column (~4 visible, rest scrolls).
  // Desktop (>=640px): equal-width columns filling the container.
  const [isSmall, setIsSmall] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const gridColStyle = isSmall
    ? `repeat(${visibleColCount}, 24vw)`
    : `repeat(${visibleColCount}, minmax(0, 1fr))`;

  // Group orders by date string
  const ordersByDay = useMemo(() => {
    const map: Record<string, OrderForCalendar[]> = {};
    if (!orders) return map;
    for (const order of orders as OrderForCalendar[]) {
      if (!order.dueDate) continue;
      const key = toDateString(new Date(order.dueDate));
      if (!map[key]) map[key] = [];
      map[key].push(order);
    }
    return map;
  }, [orders]);

  // Date range limits: 12 months back, 2 months forward
  const minDate = useMemo(() => new Date(today.getFullYear(), today.getMonth() - 12, 1), [today]);
  const maxDate = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 2, 1), [today]);
  const canGoPrev = year > minDate.getFullYear() || (year === minDate.getFullYear() && month > minDate.getMonth());
  const canGoNext = year < maxDate.getFullYear() || (year === maxDate.getFullYear() && month < maxDate.getMonth());

  const goToPrevMonth = useCallback(() => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }, [month]);

  const goToNextMonth = useCallback(() => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }, [month]);

  const todayCellRef = useRef<HTMLDivElement>(null);

  const scrollToToday = useCallback(() => {
    if (!isSmall || !todayCellRef.current) return;
    todayCellRef.current.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, [isSmall]);

  const goToToday = useCallback(() => {
    const alreadyOnMonth = year === today.getFullYear() && month === today.getMonth();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    if (alreadyOnMonth) {
      scrollToToday();
    } else {
      // Month will change, scroll after render
      requestAnimationFrame(() => scrollToToday());
    }
  }, [today, year, month, scrollToToday]);

  const handleOrderClick = useCallback(
    (id: number) => navigate(`/orders/${id}`),
    [navigate],
  );

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDay(date);
  }, []);

  const handleCreateOrder = useCallback((dateStr: string) => {
    setSelectedDay(null);
    setNewOrderDate(dateStr);
  }, []);

  const handleMonthSelect = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
  }, []);

  const monthLabel = new Date(year, month).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });

  // Summary stats
  const totalOrders = aggregates?.reduce((sum, a) => sum + a.total, 0) ?? 0;
  const totalReceived = aggregates?.reduce((sum, a) => sum + a.received, 0) ?? 0;
  const totalInProgress = aggregates?.reduce((sum, a) => sum + a.inProgress, 0) ?? 0;
  const totalReady = aggregates?.reduce((sum, a) => sum + a.ready, 0) ?? 0;

  const selectedDayOrders = useMemo(() => {
    if (!selectedDay) return [];
    const key = toDateString(selectedDay);
    return ordersByDay[key] ?? [];
  }, [selectedDay, ordersByDay]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-0.5">
          <button onClick={goToPrevMonth} disabled={!canGoPrev} className={cn('rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100', !canGoPrev && 'pointer-events-none opacity-30')}>
            <ChevronLeft className="h-5 w-5 rtl:scale-x-[-1]" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMonthPicker((v) => !v)}
              className="w-40 rounded-md px-1.5 py-1 text-center text-body font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
            >
              {monthLabel}
            </button>
            {showMonthPicker && (
              <MonthPicker
                year={year}
                month={month}
                onSelect={handleMonthSelect}
                onClose={() => setShowMonthPicker(false)}
                language={i18n.language}
              />
            )}
          </div>
          <button onClick={goToNextMonth} disabled={!canGoNext} className={cn('rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100', !canGoNext && 'pointer-events-none opacity-30')}>
            <ChevronRight className="h-5 w-5 rtl:scale-x-[-1]" />
          </button>
          <button
            onClick={goToToday}
            className="ms-1 rounded-md border border-neutral-200 px-2 py-1 text-caption font-medium text-neutral-600 hover:bg-neutral-50"
          >
            {t('calendar.today', 'Today')}
          </button>
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter(undefined)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-caption font-medium transition-colors',
              statusFilter === undefined
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50',
            )}
          >
            {t('common.all', 'All')} ({totalOrders})
          </button>
          {([
            { status: 0, key: 'received', count: totalReceived },
            { status: 1, key: 'in_progress', count: totalInProgress },
            { status: 2, key: 'ready', count: totalReady },
          ] as const).map(({ status, key, count }) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? undefined : status)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-caption font-medium transition-colors',
                statusFilter === status
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50',
              )}
            >
              <span className={cn('me-1 inline-block h-2 w-2 rounded-full', STATUS_DOT_COLORS[key])} />
              {t(`orders.status.${key}`, key)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div ref={scrollRef} className="overflow-x-auto sm:overflow-x-visible">
        <div className="min-w-max sm:min-w-0">
        {/* Weekday headers */}
        <div className="grid border-b border-neutral-100 bg-neutral-50" style={{ gridTemplateColumns: gridColStyle }}>
          {weekdayKeys.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-caption font-semibold uppercase text-neutral-500">
              {t(`calendar.weekdays.${day}`, day)}
            </div>
          ))}
        </div>

        {/* Day grid */}
        {isLoading && !orders ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className={cn('grid transition-opacity duration-150', isFetching && 'opacity-50')} style={{ gridTemplateColumns: gridColStyle }}>
            {calendarDays.map((date, i) => {
              const key = toDateString(date);
              const dayOrders = ordersByDay[key] ?? [];
              const isToday = isSameDay(date, today);
              return (
                <div key={i} ref={isToday ? todayCellRef : undefined}>
                  <DayCell
                    date={date}
                    isCurrentMonth={date.getMonth() === month}
                    isToday={isToday}
                    orders={dayOrders}
                    onOrderClick={handleOrderClick}
                    onDayClick={handleDayClick}
                    t={t}
                  />
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-caption text-neutral-500">
        <span className="font-medium">{t('calendar.legend', 'Legend')}:</span>
        {(['received', 'in_progress', 'ready', 'delivered'] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLORS[status])} />
            {t(`orders.status.${status}`, status)}
          </span>
        ))}
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetail
          date={selectedDay}
          orders={selectedDayOrders}
          onClose={() => setSelectedDay(null)}
          onOrderClick={(id) => { setSelectedDay(null); handleOrderClick(id); }}
          onCreateOrder={handleCreateOrder}
          t={t}
          formatDate={formatDate}
        />
      )}

      {/* New Order Modal */}
      <NewOrderModal
        open={!!newOrderDate}
        onClose={() => setNewOrderDate(null)}
        defaultDueDate={newOrderDate ?? undefined}
      />
    </div>
  );
}
