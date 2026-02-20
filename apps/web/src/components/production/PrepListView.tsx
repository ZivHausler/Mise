import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePrepList, useTogglePrepItem } from '@/api/hooks';
import { cn } from '@/utils/cn';

interface PrepListViewProps {
  date: string;
}

export function PrepListView({ date }: PrepListViewProps) {
  const { t } = useTranslation();
  const { data: prepList = [], isLoading } = usePrepList(date);
  const togglePrepItem = useTogglePrepItem();

  if (isLoading) {
    return <div className="h-64 animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-lg" />;
  }

  const groups = prepList as any[];

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        {t('production.prep.noItems')}
      </div>
    );
  }

  const totalGroups = groups.length;
  const preppedGroups = groups.filter((g) => g.preppedCount === g.totalCount).length;
  const progressPct = totalGroups > 0 ? (preppedGroups / totalGroups) * 100 : 0;

  const handleToggleGroup = (group: any, isPrepped: boolean) => {
    for (const item of group.items) {
      if (item.isPrepped !== isPrepped) {
        togglePrepItem.mutate({ id: item.id, isPrepped });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-lg bg-white dark:bg-neutral-800 border dark:border-neutral-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-body-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('production.prep.title')}
          </h3>
          <span className="text-body-sm text-neutral-500">
            {t('production.prep.progress', { done: preppedGroups, total: totalGroups })}
          </span>
        </div>
        <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Ingredient list */}
      <div className="space-y-2">
        {/* Desktop table header */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-body-sm font-medium text-neutral-500">
          <div className="col-span-1" />
          <div className="col-span-4">{t('production.prep.ingredient')}</div>
          <div className="col-span-3">{t('production.prep.required')}</div>
          <div className="col-span-4">{t('production.recipe')}</div>
        </div>

        {groups.map((group: any) => {
          const allPrepped = group.preppedCount === group.totalCount;
          const recipeNames = [...new Set(group.items.map((i: any) => i.recipeName))].join(', ');

          return (
            <React.Fragment key={group.ingredientId}>
              {/* Mobile card */}
              <div className={cn(
                'md:hidden rounded-lg border p-3',
                allPrepped
                  ? 'bg-green-50/50 dark:bg-green-900/10 border-neutral-200 dark:border-neutral-700'
                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
              )}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allPrepped}
                    onChange={(e) => handleToggleGroup(group, e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-body-sm font-medium',
                      allPrepped && 'line-through text-neutral-400',
                    )}>
                      {group.ingredientName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {group.totalRequired} {group.unit} — {recipeNames}
                    </p>
                  </div>
                </label>
              </div>

              {/* Desktop row */}
              <div className={cn(
                'hidden md:grid grid-cols-12 gap-3 items-center rounded-lg border px-4 py-2.5 transition-colors',
                allPrepped
                  ? 'bg-green-50/50 dark:bg-green-900/10 border-neutral-200 dark:border-neutral-700'
                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
              )}>
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={allPrepped}
                    onChange={(e) => handleToggleGroup(group, e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div className={cn(
                  'col-span-4 text-body-sm font-medium',
                  allPrepped && 'line-through text-neutral-400',
                )}>
                  {group.ingredientName}
                </div>
                <div className="col-span-3 text-body-sm text-neutral-600 dark:text-neutral-400">
                  {group.totalRequired} {group.unit}
                </div>
                <div className="col-span-4 text-body-sm text-neutral-500">
                  {recipeNames}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {preppedGroups === totalGroups && totalGroups > 0 && (
        <div className="text-center py-4 text-green-600 font-medium">
          {t('production.prep.allPrepped')}
        </div>
      )}
    </div>
  );
}
