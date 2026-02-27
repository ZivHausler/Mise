import React from 'react';
import { useTranslation } from 'react-i18next';
import { Droppable } from '@hello-pangea/dnd';
import { BatchCard } from './BatchCard';
import { STAGE_COLORS, stageLabelKey } from '@/utils/productionStage';
import { cn } from '@/utils/cn';

interface BatchData {
  id: number;
  recipe?: { id: string; name: string };
  quantity: number;
  stage: number;
  priority: number;
  assignedTo?: string;
  notes?: string;
  source: string;
}

interface KanbanColumnProps {
  stage: number;
  stageKey: string;
  batches: BatchData[];
  variant: 'default' | 'kiosk';
  onBatchClick: (id: number) => void;
  onAdvance?: (id: number, newStage: number) => void;
}

export function KanbanColumn({ stage, stageKey, batches, variant, onBatchClick, onAdvance }: KanbanColumnProps) {
  const { t } = useTranslation();
  const colors = STAGE_COLORS[stage] ?? STAGE_COLORS[0]!;
  const isKiosk = variant === 'kiosk';

  return (
    <div className={cn(
      'flex-shrink-0 flex flex-col rounded-lg',
      isKiosk ? 'w-60 bg-neutral-800 border border-neutral-700' : 'w-52 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
      'h-full min-h-0',
    )}>
      {/* Column header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 rounded-t-lg border-b',
        isKiosk
          ? `${colors.darkBg} border-neutral-700`
          : `${colors.bg} border-neutral-200 dark:border-neutral-700`,
      )}>
        <span className={cn(
          'text-body-sm font-semibold',
          isKiosk ? colors.darkText : colors.text,
        )}>
          {t(stageLabelKey(stage))}
        </span>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          isKiosk ? 'bg-neutral-700 text-neutral-300' : 'bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300',
        )}>
          {batches.length}
        </span>
      </div>

      {/* Droppable card area */}
      <Droppable droppableId={String(stage)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 overflow-y-auto p-2 space-y-2 transition-colors',
              !isKiosk && 'min-h-[120px]',
              snapshot.isDraggingOver && (isKiosk ? 'bg-neutral-700/50' : 'bg-primary-50/50 dark:bg-primary-900/20'),
            )}
          >
            {batches.map((batch, index) => (
              <BatchCard
                key={String(batch.id)}
                index={index}
                batch={batch}
                variant={variant}
                onClick={() => onBatchClick(batch.id)}
                onAdvance={stage < 6 && onAdvance ? () => onAdvance(batch.id, stage + 1) : undefined}
                onRevert={stage > 0 && onAdvance ? () => onAdvance(batch.id, stage - 1) : undefined}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
