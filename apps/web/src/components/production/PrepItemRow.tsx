import React from 'react';
import { cn } from '@/utils/cn';

interface PrepItemRowProps {
  item: {
    id: number;
    ingredient?: { id: number; name: string };
    requiredQuantity: number;
    unit: string;
    isPrepped: boolean;
    recipe?: { id: string; name: string };
  };
  onToggle: (isPrepped: boolean) => void;
}

export function PrepItemRow({ item, onToggle }: PrepItemRowProps) {
  return (
    <>
      {/* Mobile card */}
      <div className="md:hidden rounded-lg bg-white dark:bg-neutral-800 border dark:border-neutral-700 p-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={item.isPrepped}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-5 w-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
          />
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-body-sm font-medium',
              item.isPrepped && 'line-through text-neutral-400',
            )}>
              {item.ingredient?.name}
            </p>
            <p className="text-xs text-neutral-500">
              {item.requiredQuantity} {item.unit} — {item.recipe?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop row */}
      <div className={cn(
        'hidden md:grid grid-cols-12 gap-3 items-center rounded-lg px-4 py-2.5 transition-colors',
        item.isPrepped
          ? 'bg-green-50/50 dark:bg-green-900/10'
          : 'bg-white dark:bg-neutral-800 border dark:border-neutral-700',
      )}>
        <div className="col-span-1">
          <input
            type="checkbox"
            checked={item.isPrepped}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
          />
        </div>
        <div className={cn(
          'col-span-4 text-body-sm font-medium',
          item.isPrepped && 'line-through text-neutral-400',
        )}>
          {item.ingredient?.name}
        </div>
        <div className="col-span-3 text-body-sm text-neutral-600 dark:text-neutral-400">
          {item.requiredQuantity} {item.unit}
        </div>
        <div className="col-span-4 text-body-sm text-neutral-500">
          {item.recipe?.name}
        </div>
      </div>
    </>
  );
}
