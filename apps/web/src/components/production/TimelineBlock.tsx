import React from 'react';
import { useTranslation } from 'react-i18next';
import { STAGE_COLORS, stageLabelKey } from '@/utils/productionStage';
import { cn } from '@/utils/cn';

interface TimelineBlockProps {
  batch: {
    id: string;
    recipeName: string;
    quantity: number;
    stage: number;
  };
  span: number;
}

export function TimelineBlock({ batch, span }: TimelineBlockProps) {
  const { t } = useTranslation();
  const colors = STAGE_COLORS[batch.stage] ?? STAGE_COLORS[0]!;

  return (
    <div
      className={cn(
        'rounded-md px-2 py-1.5 mx-0.5 my-1 text-xs font-medium truncate cursor-pointer hover:opacity-80 transition-opacity',
        colors.bg,
        colors.text,
      )}
      style={{ gridColumn: `span ${span}` }}
      title={`${batch.recipeName} x${batch.quantity} — ${t(stageLabelKey(batch.stage))}`}
    >
      <div className="truncate">{batch.recipeName}</div>
      <div className="text-[10px] opacity-70">x{batch.quantity}</div>
    </div>
  );
}
