import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Scissors, Trash2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { NumberInput } from '@/components/FormFields';
import { useProductionBatch, useUpdateBatch, useUpdateBatchStage, useDeleteBatch, useSplitBatch } from '@/api/hooks';
import { stageLabelKey, STAGE_COLORS, getPriorityConfig, priorityLabelKey } from '@/utils/productionStage';
import { cn } from '@/utils/cn';

interface BatchDetailModalProps {
  batchId: number;
  onClose: () => void;
}

export function BatchDetailModal({ batchId, onClose }: BatchDetailModalProps) {
  const { t } = useTranslation();
  const { data: batch, isLoading } = useProductionBatch(batchId);
  const updateStage = useUpdateBatchStage();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();
  const splitBatch = useSplitBatch();
  const [splitQty, setSplitQty] = useState(1);
  const [showSplit, setShowSplit] = useState(false);

  const b = batch as any;

  const handleAdvance = () => {
    if (!b || b.stage >= 6) return;
    updateStage.mutate({ id: batchId, stage: b.stage + 1 });
  };

  const handleRevert = () => {
    if (!b || b.stage <= 0) return;
    updateStage.mutate({ id: batchId, stage: b.stage - 1 });
  };

  const handleDelete = () => {
    if (confirm(t('production.deleteMsg'))) {
      deleteBatch.mutate(batchId, { onSuccess: onClose });
    }
  };

  const handleSplit = () => {
    splitBatch.mutate({ id: batchId, splitQuantity: splitQty }, {
      onSuccess: () => setShowSplit(false),
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={b?.recipe?.name || t('production.batch')}>
      {isLoading || !b ? (
        <div className="h-40 animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded" />
      ) : (
        <div className="space-y-4">
          {/* Stage badge + controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'rounded-full px-3 py-1 text-body-sm font-medium',
              STAGE_COLORS[b.stage]?.bg ?? 'bg-neutral-100',
              STAGE_COLORS[b.stage]?.text ?? 'text-neutral-700',
            )}>
              {t(stageLabelKey(b.stage))}
            </span>
            {b.stage > 0 && (
              <Button variant="ghost" size="sm" onClick={handleRevert} disabled={updateStage.isPending}>
                {t('orders.revert')}
              </Button>
            )}
            {b.stage < 6 && (
              <Button variant="primary" size="sm" onClick={handleAdvance} disabled={updateStage.isPending}>
                {t('production.advance')}
              </Button>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-body-sm">
            <div>
              <span className="text-neutral-500">{t('production.quantity')}</span>
              <p className="font-medium">{b.quantity}</p>
            </div>
            {b.priority > 0 && (
              <div>
                <span className="text-neutral-500">{t('production.priority')}</span>
                <div className="mt-0.5">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-body-sm font-medium', getPriorityConfig(b.priority).bg, getPriorityConfig(b.priority).text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', getPriorityConfig(b.priority).dot)} />
                    {t(priorityLabelKey(b.priority))}
                  </span>
                </div>
              </div>
            )}
            {b.assignedTo && (
              <div>
                <span className="text-neutral-500">{t('production.assignedTo')}</span>
                <p className="font-medium">{b.assignedTo}</p>
              </div>
            )}
            <div>
              <span className="text-neutral-500">{t('production.source')}</span>
              <p className="font-medium">{b.source === 'auto' ? t('production.sourceAuto') : t('production.sourceManual')}</p>
            </div>
          </div>

          {b.notes && (
            <div>
              <span className="text-body-sm text-neutral-500">{t('production.notes')}</span>
              <p className="text-body-sm mt-0.5">{b.notes}</p>
            </div>
          )}

          {/* Order sources */}
          {b.orderSources && b.orderSources.length > 0 && (
            <div>
              <h4 className="text-body-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('production.orderSources')}</h4>
              <div className="space-y-1">
                {b.orderSources.map((src: any) => (
                  <div key={String(src.id)} className="flex items-center justify-between rounded bg-neutral-50 dark:bg-neutral-700 px-3 py-1.5 text-body-sm">
                    <span>Order: {src.orderId.slice(0, 8)}...</span>
                    <span>x{src.quantityFromOrder}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prep items checklist */}
          {b.prepItems && b.prepItems.length > 0 && (
            <div>
              <h4 className="text-body-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('production.prep.title')}</h4>
              <div className="space-y-1">
                {b.prepItems.map((item: any) => (
                  <div key={String(item.id)} className="flex items-center gap-2 rounded bg-neutral-50 dark:bg-neutral-700 px-3 py-1.5 text-body-sm">
                    <span className={cn('flex-1', item.isPrepped && 'line-through text-neutral-400')}>
                      {item.ingredient?.name}
                    </span>
                    <span className="text-neutral-500">{item.requiredQuantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Split section */}
          {showSplit ? (
            <div className="flex items-end gap-2 border-t pt-3">
              <div className="flex-1">
                <NumberInput
                  label={t('production.splitQuantity')}
                  value={splitQty}
                  onChange={(v) => setSplitQty(typeof v === 'number' ? v : 1)}
                  min={1}
                  max={b.quantity - 1}
                />
              </div>
              <Button size="sm" onClick={handleSplit} disabled={splitBatch.isPending || splitQty >= b.quantity}>
                {t('production.split')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSplit(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 border-t pt-3">
              {b.quantity > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setShowSplit(true)}>
                  <Scissors className="h-4 w-4 me-1" />
                  {t('production.split')}
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteBatch.isPending}>
                <Trash2 className="h-4 w-4 me-1" />
                {t('common.delete')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
