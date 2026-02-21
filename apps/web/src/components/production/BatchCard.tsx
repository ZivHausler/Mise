import React from 'react';
import { useTranslation } from 'react-i18next';
import { Draggable } from '@hello-pangea/dnd';
import { ChevronRight, ChevronLeft, User, GripVertical } from 'lucide-react';
import { getPriorityBorderColor } from '@/utils/productionStage';
import { cn } from '@/utils/cn';

interface BatchData {
  id: number;
  recipeName: string;
  quantity: number;
  stage: number;
  priority: number;
  assignedTo?: string;
  notes?: string;
  source: string;
}

interface BatchCardProps {
  batch: BatchData;
  index: number;
  variant: 'default' | 'kiosk';
  onClick: () => void;
  onAdvance?: () => void;
  onRevert?: () => void;
}

export function BatchCard({ batch, index, variant, onClick, onAdvance, onRevert }: BatchCardProps) {
  const { t } = useTranslation();
  const isKiosk = variant === 'kiosk';
  const borderColor = getPriorityBorderColor(batch.priority);

  return (
    <Draggable draggableId={String(batch.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            'rounded-md border-l-4 cursor-grab active:cursor-grabbing transition-shadow select-none',
            borderColor,
            isKiosk
              ? 'bg-neutral-700 p-3 hover:bg-neutral-600 min-h-[80px]'
              : 'bg-white dark:bg-neutral-700 p-2.5 shadow-xs hover:shadow-sm',
            snapshot.isDragging && 'shadow-lg ring-2 ring-primary-400 opacity-90',
          )}
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <GripVertical className={cn(
                'shrink-0 text-neutral-400 dark:text-neutral-500',
                isKiosk ? 'h-4 w-4' : 'h-3.5 w-3.5',
              )} />
              <h4 className={cn(
                'font-medium leading-tight truncate',
                isKiosk ? 'text-base text-white' : 'text-body-sm text-neutral-800 dark:text-neutral-100',
              )}>
                {batch.recipeName || t('production.batch')}
              </h4>
            </div>
            <span className={cn(
              'flex-shrink-0 rounded-full px-1.5 py-0.5 font-semibold',
              isKiosk ? 'text-sm bg-neutral-600 text-neutral-200' : 'text-xs bg-neutral-100 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200',
            )}>
              x{batch.quantity}
            </span>
          </div>

          {batch.assignedTo && (
            <div className={cn(
              'flex items-center gap-1 mt-1.5',
              isKiosk ? 'text-sm text-neutral-300' : 'text-xs text-neutral-500 dark:text-neutral-400',
            )}>
              <User className={cn(isKiosk ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
              <span className="truncate">{batch.assignedTo}</span>
            </div>
          )}

          {batch.notes && (
            <p className={cn(
              'mt-1 truncate',
              isKiosk ? 'text-sm text-neutral-400' : 'text-xs text-neutral-400 dark:text-neutral-500',
            )}>
              {batch.notes}
            </p>
          )}

          {(onAdvance || onRevert) && (
            <div className="mt-2 flex items-center gap-1.5">
              {onRevert && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRevert(); }}
                  className={cn(
                    'flex-1 flex items-center gap-0.5 rounded-md font-medium transition-colors justify-center',
                    isKiosk
                      ? 'bg-neutral-600 text-neutral-200 px-3 py-2.5 text-sm hover:bg-neutral-500'
                      : 'bg-neutral-100 text-neutral-600 px-2 py-1 text-xs hover:bg-neutral-200 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-500',
                  )}
                >
                  <ChevronLeft className={cn(isKiosk ? 'h-4 w-4' : 'h-3 w-3', 'rtl:scale-x-[-1]')} />
                  {t('orders.revert')}
                </button>
              )}
              {onAdvance && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAdvance(); }}
                  className={cn(
                    'flex-1 flex items-center gap-1 rounded-md font-medium transition-colors justify-center',
                    isKiosk
                      ? 'bg-primary-600 text-white px-3 py-2.5 text-sm hover:bg-primary-500'
                      : 'bg-primary-50 text-primary-600 px-2 py-1 text-xs hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400',
                  )}
                >
                  {t('production.advance')}
                  <ChevronRight className={cn(isKiosk ? 'h-4 w-4' : 'h-3 w-3', 'rtl:scale-x-[-1]')} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
