import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { NumberInput, Select } from '@/components/FormFields';
import { IngredientComboBox, type IngredientOption } from './IngredientComboBox';
import { useInventory, useBulkAdjustStock, useBulkDeleteInventory } from '@/api/hooks';
import { useToastStore } from '@/store/toast';
import { cn } from '@/utils/cn';

export interface ScanResultItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  unitPrice: number;
  match: {
    type: 'exact' | 'fuzzy' | 'none';
    ingredientId: number | null;
    ingredientName: string | null;
    confidence: number;
  };
}

export interface ReceiptMeta {
  vendor: string | null;
  date: string | null;
  total: number | null;
}

interface ReviewItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  unitPrice: number;
  ingredientId: number | null;
  ingredientName: string | null;
  matchConfidence: number;
  priceMode: 'unit' | 'package';
}

interface ReceiptScannerModalProps {
  open: boolean;
  onClose: () => void;
  items: ScanResultItem[];
  receiptMeta: ReceiptMeta;
  onOpenAddItem: () => void;
  onCreatedIdsRef?: (cb: (id: number) => void) => void;
}

const ALL_UNIT_OPTIONS = [
  { value: 'kg', key: 'kg' },
  { value: 'g', key: 'g' },
  { value: 'l', key: 'l' },
  { value: 'ml', key: 'ml' },
  { value: 'pcs', key: 'pcs' },
];

const UNIT_GROUPS: Record<string, string[]> = {
  kg: ['kg', 'g'],
  g: ['kg', 'g'],
  l: ['l', 'ml'],
  ml: ['l', 'ml'],
  pcs: ['pcs'],
};

function getUnitOptions(ingredientId: number | null, allIngredients: IngredientOption[]) {
  if (ingredientId == null) return ALL_UNIT_OPTIONS;
  const ingredient = allIngredients.find((i) => i.id === ingredientId);
  if (!ingredient) return ALL_UNIT_OPTIONS;
  const group = UNIT_GROUPS[ingredient.unit] ?? ALL_UNIT_OPTIONS.map((u) => u.value);
  return ALL_UNIT_OPTIONS.filter((u) => group.includes(u.value));
}

export const ReceiptScannerModal = React.memo(function ReceiptScannerModal({
  open,
  onClose,
  items,
  receiptMeta,
  onOpenAddItem,
  onCreatedIdsRef,
}: ReceiptScannerModalProps) {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const bulkAdjust = useBulkAdjustStock();
  const bulkDelete = useBulkDeleteInventory();

  // Fetch all ingredients for combobox
  const { data: inventoryData } = useInventory(1, 500);
  const allIngredients: IngredientOption[] = useMemo(() => {
    const raw = (inventoryData?.items as Array<{ id: number; name: string; unit: string }>) ?? [];
    return raw.map((i) => ({ id: i.id, name: i.name, unit: i.unit }));
  }, [inventoryData]);

  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [createdIngredientIds, setCreatedIngredientIds] = useState<number[]>([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const pendingCreateRef = useRef<{ rowIndex: number; ingredientId: number } | null>(null);

  // Register callback so parent can push created ingredient IDs into our state
  useEffect(() => {
    if (onCreatedIdsRef) {
      onCreatedIdsRef((id: number) => {
        setCreatedIngredientIds((prev) => [...prev, id]);
        // Store pending auto-select — will be resolved once allIngredients refetches
        if (pendingCreateRef.current?.rowIndex != null) {
          pendingCreateRef.current = { ...pendingCreateRef.current, ingredientId: id };
        }
      });
    }
  }, [onCreatedIdsRef]);

  // Resolve pending auto-select when allIngredients updates with the new ingredient
  useEffect(() => {
    const pending = pendingCreateRef.current;
    if (!pending) return;
    const found = allIngredients.find((i) => i.id === pending.ingredientId);
    if (found) {
      pendingCreateRef.current = null;
      const { rowIndex } = pending;
      setReviewItems((prev) => prev.map((item, i) => {
        if (i !== rowIndex) return item;
        const group = UNIT_GROUPS[found.unit] ?? [found.unit];
        return {
          ...item,
          ingredientId: found.id,
          ingredientName: found.name,
          matchConfidence: 1,
          unit: group.includes(item.unit) ? item.unit : found.unit,
        };
      }));
    }
  }, [allIngredients]);

  // Initialize review items when scan results arrive
  useEffect(() => {
    if (items.length > 0) {
      setReviewItems(
        items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          totalPrice: item.totalPrice,
          unitPrice: item.unitPrice,
          ingredientId: item.match.ingredientId,
          ingredientName: item.match.ingredientName,
          matchConfidence: item.match.confidence,
          priceMode: 'package' as const,
        })),
      );
      setCreatedIngredientIds([]);
    }
  }, [items]);

  const matchedCount = useMemo(
    () => reviewItems.filter((i) => i.ingredientId != null).length,
    [reviewItems],
  );

  const allMatched = useMemo(
    () => reviewItems.length > 0 && reviewItems.every((i) => i.ingredientId != null),
    [reviewItems],
  );

  const updateItem = useCallback((index: number, patch: Partial<ReviewItem>) => {
    setReviewItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }, []);

  const removeItem = useCallback((index: number) => {
    setReviewItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleIngredientChange = useCallback(
    (index: number, ingredientId: number | null, ingredientName: string | null) => {
      const patch: Partial<ReviewItem> = { ingredientId, ingredientName, matchConfidence: ingredientId ? 1 : 0 };
      // When ingredient is selected, ensure unit is compatible
      if (ingredientId != null) {
        const ingredient = allIngredients.find((i) => i.id === ingredientId);
        if (ingredient) {
          const group = UNIT_GROUPS[ingredient.unit] ?? [ingredient.unit];
          setReviewItems((prev) => {
            const current = prev[index];
            if (current && !group.includes(current.unit)) {
              return prev.map((item, i) => i === index ? { ...item, ...patch, unit: ingredient.unit } : item);
            }
            return prev.map((item, i) => i === index ? { ...item, ...patch } : item);
          });
          return;
        }
      }
      updateItem(index, patch);
    },
    [updateItem, allIngredients],
  );

  const handleConfirm = useCallback(() => {
    const adjustments = reviewItems
      .filter((item) => item.ingredientId != null)
      .map((item) => ({
        ingredientId: item.ingredientId!,
        quantity: item.quantity,
        pricePaid: item.priceMode === 'unit' ? item.unitPrice * item.quantity : item.totalPrice,
        reason: `Receipt scan: ${item.name}`,
      }));

    if (adjustments.length === 0) return;
    bulkAdjust.mutate({ adjustments }, {
      onSuccess: (data) => {
        if (data.summary.failed > 0) {
          addToast('warning', t('toasts.receiptPartialSuccess', { succeeded: data.summary.succeeded, failed: data.summary.failed }));
        } else {
          addToast('success', t('toasts.receiptApplied'));
        }
        onClose();
      },
    });
  }, [reviewItems, bulkAdjust, onClose]);

  const handleCancel = useCallback(() => {
    if (createdIngredientIds.length > 0) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [createdIngredientIds, onClose]);

  const handleDiscard = useCallback(() => {
    if (createdIngredientIds.length > 0) {
      bulkDelete.mutate(
        { ingredientIds: createdIngredientIds },
        { onSuccess: () => { setShowDiscardConfirm(false); onClose(); } },
      );
    } else {
      setShowDiscardConfirm(false);
      onClose();
    }
  }, [createdIngredientIds, bulkDelete, onClose]);

  const handleCreateIngredient = useCallback((rowIndex: number) => {
    pendingCreateRef.current = { rowIndex, ingredientId: 0 };
    onOpenAddItem();
  }, [onOpenAddItem]);

  return (
    <>
      <Modal
        open={open}
        onClose={handleCancel}
        title={t('inventory.receiptScanner')}
        size="full"
        footer={
          <>
            <Button variant="secondary" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={bulkAdjust.isPending}
              disabled={!allMatched || reviewItems.length === 0}
            >
              {t('inventory.confirmItems', { count: matchedCount })}
            </Button>
          </>
        }
      >
        {/* Receipt meta */}
        {(receiptMeta.vendor || receiptMeta.date || receiptMeta.total != null) && (
          <div className="mb-4 flex flex-wrap gap-4 rounded-lg bg-neutral-50 px-4 py-3 text-body-sm text-neutral-600">
            {receiptMeta.vendor && (
              <span>
                <span className="font-semibold">{t('inventory.receiptVendor')}:</span>{' '}
                <span dir="auto">{receiptMeta.vendor}</span>
              </span>
            )}
            {receiptMeta.date && (
              <span>
                <span className="font-semibold">{t('inventory.receiptDate')}:</span>{' '}
                <span dir="ltr">{receiptMeta.date}</span>
              </span>
            )}
            {receiptMeta.total != null && (
              <span>
                <span className="font-semibold">{t('inventory.receiptTotal')}:</span>{' '}
                <span dir="ltr">{t('common.currency')}{receiptMeta.total.toFixed(2)}</span>
              </span>
            )}
          </div>
        )}

        {/* Match info banner */}
        <div
          className={cn(
            'mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-body-sm',
            allMatched
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700',
          )}
        >
          {allMatched ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <Info className="h-4 w-4 shrink-0" />
          )}
          {t('inventory.itemsMatched', {
            matched: matchedCount,
            total: reviewItems.length,
          })}
        </div>

        {reviewItems.length === 0 ? (
          <div className="py-8 text-center text-neutral-400">
            <p className="font-semibold">{t('inventory.noItemsFound')}</p>
            <p className="mt-1 text-body-sm">{t('inventory.noItemsFoundDesc')}</p>
          </div>
        ) : (
          <>
            {/* Desktop table (hidden on mobile) */}
            <div className="hidden sm:block">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500">
                    <th className="px-2 py-2 text-start font-medium">#</th>
                    <th className="px-2 py-2 text-start font-medium">{t('inventory.receiptItem')}</th>
                    <th className="min-w-[200px] px-2 py-2 text-start font-medium">{t('inventory.matchedIngredient')}</th>
                    <th className="px-2 py-2 text-start font-medium">{t('common.qty')}</th>
                    <th className="px-2 py-2 text-start font-medium">{t('inventory.unit')}</th>
                    <th className="px-2 py-2 text-start font-medium">{t('inventory.price')}</th>
                    <th className="px-2 py-2 text-center font-medium">{t('inventory.perUnit')}/{t('inventory.perPackage')}</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {reviewItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        'border-b border-neutral-100',
                        item.ingredientId == null && 'bg-amber-50/50',
                      )}
                    >
                      <td className="px-2 py-2 align-top pt-3 text-neutral-400">{idx + 1}</td>
                      <td className="px-2 py-2 align-top pt-3 font-medium" dir="auto">
                        <span>{item.name}</span>
                        {item.ingredientId == null && item.matchConfidence < 0.5 && (
                          <p className="mt-0.5 text-xs text-amber-600">{t('inventory.noMatch')}</p>
                        )}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <IngredientComboBox
                          ingredients={allIngredients}
                          value={item.ingredientId}
                          onChange={(id, name) => handleIngredientChange(idx, id, name)}
                          matchConfidence={item.matchConfidence}
                          onCreateIngredient={() => handleCreateIngredient(idx)}
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <NumberInput
                          value={item.quantity}
                          onChange={(v) => updateItem(idx, { quantity: v === '' ? 0 : v })}
                          min={0}
                          size="sm"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Select
                          options={getUnitOptions(item.ingredientId, allIngredients).map((u) => ({
                            value: u.value,
                            label: t(`common.units.${u.key}`, u.value),
                          }))}
                          value={item.unit}
                          onChange={(e) => updateItem(idx, { unit: e.target.value })}
                          size="sm"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <NumberInput
                          value={item.priceMode === 'unit' ? item.unitPrice : item.totalPrice}
                          onChange={(v) => {
                            const num = v === '' ? 0 : v;
                            if (item.priceMode === 'unit') {
                              updateItem(idx, { unitPrice: num, totalPrice: num * item.quantity });
                            } else {
                              updateItem(idx, {
                                totalPrice: num,
                                unitPrice: item.quantity > 0 ? num / item.quantity : 0,
                              });
                            }
                          }}
                          min={0}
                          step={0.01}
                          size="sm"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="relative mx-auto grid w-fit grid-cols-2 rounded-lg bg-neutral-100 p-0.5">
                          <div
                            className="absolute inset-y-0.5 w-[calc(50%-2px)] rounded-md bg-white shadow-sm transition-[inset-inline-start] duration-200 ease-in-out"
                            style={{
                              insetInlineStart:
                                item.priceMode === 'unit' ? '2px' : 'calc(50%)',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(idx, { priceMode: 'unit' })}
                            className={cn(
                              'relative z-10 whitespace-nowrap rounded-md px-2 py-0.5 text-caption font-medium transition-colors duration-200',
                              item.priceMode === 'unit'
                                ? 'text-neutral-900'
                                : 'text-neutral-500 hover:text-neutral-700',
                            )}
                          >
                            {t('inventory.perUnit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItem(idx, { priceMode: 'package' })}
                            className={cn(
                              'relative z-10 whitespace-nowrap rounded-md px-2 py-0.5 text-caption font-medium transition-colors duration-200',
                              item.priceMode === 'package'
                                ? 'text-neutral-900'
                                : 'text-neutral-500 hover:text-neutral-700',
                            )}
                          >
                            {t('inventory.perPackage')}
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(idx)}
                          title={t('inventory.removeRow')}
                        >
                          <X className="h-4 w-4 text-neutral-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (visible on small screens) */}
            <div className="flex flex-col gap-3 sm:hidden">
              {reviewItems.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-lg border p-3',
                    item.ingredientId == null
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-neutral-200 bg-white',
                  )}
                >
                  {/* Row 1: Name + Remove */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-body-sm" dir="auto">
                      {item.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(idx)}
                      title={t('inventory.removeRow')}
                    >
                      <X className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </div>

                  {/* Row 2: Ingredient ComboBox */}
                  <div className="mb-2">
                    <IngredientComboBox
                      ingredients={allIngredients}
                      value={item.ingredientId}
                      onChange={(id, name) => handleIngredientChange(idx, id, name)}
                      matchConfidence={item.matchConfidence}
                      onCreateIngredient={() => handleCreateIngredient(idx)}
                    />
                  </div>

                  {/* Row 3: Qty + Unit */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <NumberInput
                      label={t('common.qty')}
                      value={item.quantity}
                      onChange={(v) => updateItem(idx, { quantity: v === '' ? 0 : v })}
                      min={0}
                      size="sm"
                    />
                    <Select
                      label={t('inventory.unit')}
                      options={getUnitOptions(item.ingredientId, allIngredients).map((u) => ({
                        value: u.value,
                        label: t(`common.units.${u.key}`, u.value),
                      }))}
                      value={item.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      size="sm"
                    />
                  </div>

                  {/* Row 4: Price + Price Mode */}
                  <div className="grid grid-cols-2 gap-2">
                    <NumberInput
                      label={t('inventory.price')}
                      value={item.priceMode === 'unit' ? item.unitPrice : item.totalPrice}
                      onChange={(v) => {
                        const num = v === '' ? 0 : v;
                        if (item.priceMode === 'unit') {
                          updateItem(idx, { unitPrice: num, totalPrice: num * item.quantity });
                        } else {
                          updateItem(idx, {
                            totalPrice: num,
                            unitPrice: item.quantity > 0 ? num / item.quantity : 0,
                          });
                        }
                      }}
                      min={0}
                      step={0.01}
                      size="sm"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-body-sm font-semibold text-neutral-700">
                        {t('inventory.perUnit')}/{t('inventory.perPackage')}
                      </span>
                      <div className="relative grid grid-cols-2 rounded-lg bg-neutral-100 p-0.5">
                        <div
                          className="absolute inset-y-0.5 w-[calc(50%-2px)] rounded-md bg-white shadow-sm transition-[inset-inline-start] duration-200 ease-in-out"
                          style={{
                            insetInlineStart:
                              item.priceMode === 'unit' ? '2px' : 'calc(50%)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => updateItem(idx, { priceMode: 'unit' })}
                          className={cn(
                            'relative z-10 whitespace-nowrap rounded-md px-2 py-1 text-caption font-medium transition-colors duration-200',
                            item.priceMode === 'unit'
                              ? 'text-neutral-900'
                              : 'text-neutral-500 hover:text-neutral-700',
                          )}
                        >
                          {t('inventory.perUnit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItem(idx, { priceMode: 'package' })}
                          className={cn(
                            'relative z-10 whitespace-nowrap rounded-md px-2 py-1 text-caption font-medium transition-colors duration-200',
                            item.priceMode === 'package'
                              ? 'text-neutral-900'
                              : 'text-neutral-500 hover:text-neutral-700',
                          )}
                        >
                          {t('inventory.perPackage')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      {/* Discard confirmation sub-modal */}
      <ConfirmModal
        open={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleDiscard}
        title={t('inventory.discardScanTitle')}
        message={t('inventory.discardScanMessage', { count: createdIngredientIds.length })}
        confirmText={t('inventory.discardChanges')}
        cancelText={t('inventory.keepEditing')}
        variant="danger"
        loading={bulkDelete.isPending}
      />
    </>
  );
});
