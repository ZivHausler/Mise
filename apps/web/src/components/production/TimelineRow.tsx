import React from 'react';
import { TimelineBlock } from './TimelineBlock';
import { cn } from '@/utils/cn';

interface TimelineRowProps {
  batch: {
    id: number;
    recipeName: string;
    quantity: number;
    stage: number;
  };
  index: number;
  totalCols: number;
}

export function TimelineRow({ batch, index, totalCols }: TimelineRowProps) {
  // Estimate a start column based on stage and index (heuristic since we don't have time data)
  // In a real implementation, this would use actual start/end times
  const startCol = Math.min(batch.stage * 4 + 1, totalCols - 3);
  const spanCols = Math.min(4, totalCols - startCol + 1);

  return (
    <div
      className={cn(
        'grid border-b dark:border-neutral-700',
        index % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-800/50',
      )}
      style={{ gridTemplateColumns: `160px repeat(${totalCols}, minmax(40px, 1fr))` }}
    >
      <div className="px-3 py-2 text-body-sm font-medium text-neutral-800 dark:text-neutral-200 line-clamp-2 break-words border-e dark:border-neutral-700 flex items-center">
        {batch.recipeName || 'Batch'}
      </div>
      {/* Empty cells + block */}
      {Array.from({ length: totalCols }).map((_, colIdx) => {
        if (colIdx === startCol - 1) {
          return (
            <TimelineBlock
              key={colIdx}
              batch={batch}
              span={spanCols}
            />
          );
        }
        if (colIdx >= startCol - 1 && colIdx < startCol - 1 + spanCols) {
          return null; // covered by span
        }
        return <div key={colIdx} className="border-e dark:border-neutral-700/50" />;
      })}
    </div>
  );
}
