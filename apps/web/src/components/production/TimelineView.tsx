import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductionTimeline } from '@/api/hooks';
import { TimelineRow } from './TimelineRow';
import { EmptyState } from '@/components/DataDisplay';
import { cn } from '@/utils/cn';

interface TimelineViewProps {
  date: string;
}

// Generate hour labels from 5am to 8pm
const HOURS = Array.from({ length: 16 }, (_, i) => i + 5);
const HALF_HOUR_COLS = HOURS.length * 2; // 30min columns

export function TimelineView({ date }: TimelineViewProps) {
  const { t } = useTranslation();
  const { data: batches = [], isLoading } = useProductionTimeline(date);

  const now = useMemo(() => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }, []);

  const currentTimeOffset = useMemo(() => {
    const hours = now - 5; // offset from 5am
    if (hours < 0 || hours > 15) return null;
    return (hours / 15) * 100;
  }, [now]);

  if (isLoading) {
    return <div className="h-64 animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-lg" />;
  }

  if ((batches as any[]).length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        {t('production.timelineView.noData')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg bg-white dark:bg-neutral-800 dark:border-neutral-700">
      {/* Time header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-800 border-b dark:border-neutral-700">
        <div className="grid" style={{ gridTemplateColumns: `160px repeat(${HALF_HOUR_COLS}, minmax(40px, 1fr))` }}>
          <div className="px-3 py-2 text-body-sm font-medium text-neutral-500 border-e dark:border-neutral-700">
            {t('production.recipe')}
          </div>
          {HOURS.map((h) => (
            <React.Fragment key={h}>
              <div className="col-span-2 px-1 py-2 text-center text-xs text-neutral-400 border-e dark:border-neutral-700">
                {h.toString().padStart(2, '0')}:00
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Timeline rows */}
      <div className="relative">
        {/* Current time indicator */}
        {currentTimeOffset !== null && date === new Date().toISOString().split('T')[0] && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `calc(160px + ${currentTimeOffset}% * (100% - 160px) / 100)` }}
          />
        )}

        {(batches as any[]).map((batch: any, idx: number) => (
          <TimelineRow
            key={String(batch.id)}
            batch={batch}
            index={idx}
            totalCols={HALF_HOUR_COLS}
          />
        ))}
      </div>
    </div>
  );
}
