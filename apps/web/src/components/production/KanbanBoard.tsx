import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { STAGE_KEYS } from '@/utils/productionStage';
import { cn } from '@/utils/cn';

interface BatchData {
  id: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  stage: number;
  priority: number;
  assignedTo?: string;
  notes?: string;
  source: string;
  productionDate: string;
}

interface KanbanBoardProps {
  batches: BatchData[];
  isLoading: boolean;
  variant: 'default' | 'kiosk';
  onBatchClick: (id: string) => void;
  onAdvance?: (id: string, newStage: number) => void;
}

export function KanbanBoard({ batches, isLoading, variant, onBatchClick, onAdvance }: KanbanBoardProps) {
  const { t } = useTranslation();

  const columns = STAGE_KEYS.map((key, index) => {
    const columnBatches = batches.filter((b) => b.stage === index);
    return { stage: index, key, batches: columnBatches };
  });

  const handleDragEnd = useCallback((result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination || !onAdvance) return;

    const newStage = Number(destination.droppableId);
    const batch = batches.find((b) => b.id === draggableId);
    if (!batch || batch.stage === newStage) return;

    onAdvance(draggableId, newStage);
  }, [batches, onAdvance]);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={cn('flex-shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse', variant === 'kiosk' ? 'w-56 h-96' : 'w-48 h-64')} />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={cn(
        'flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex-1 min-h-0',
        variant === 'kiosk' && 'gap-4'
      )}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.stage}
            stage={col.stage}
            stageKey={col.key}
            batches={col.batches}
            variant={variant}
            onBatchClick={onBatchClick}
            onAdvance={onAdvance}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
