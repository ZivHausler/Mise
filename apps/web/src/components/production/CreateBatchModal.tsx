import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextInput, NumberInput, Select } from '@/components/FormFields';
import { useCreateBatch, useRecipes } from '@/api/hooks';
import { PRIORITY_KEYS } from '@/utils/productionStage';

interface CreateBatchModalProps {
  date: string;
  onClose: () => void;
}

export function CreateBatchModal({ date, onClose }: CreateBatchModalProps) {
  const { t } = useTranslation();
  const createBatch = useCreateBatch();
  const { data: recipes = [] } = useRecipes();

  const [recipeId, setRecipeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState(0);
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  const selectedRecipe = (recipes as any[]).find((r: any) => r.id === recipeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeId) return;

    createBatch.mutate(
      {
        recipeId,
        recipeName: selectedRecipe?.name ?? '',
        quantity,
        productionDate: date,
        priority,
        assignedTo: assignedTo || undefined,
        notes: notes || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open={true} onClose={onClose} title={t('production.createBatch')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-body-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {t('production.recipe')}
          </label>
          <select
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
            required
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-body-sm bg-white dark:bg-neutral-800 dark:border-neutral-600"
          >
            <option value="">{t('common.select')}</option>
            {(recipes as any[]).map((r: any) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <NumberInput
          label={t('production.quantity')}
          value={quantity}
          onChange={(v) => setQuantity(typeof v === 'number' ? v : 1)}
          min={1}
          max={100000}
        />

        <Select
          label={t('production.priority')}
          value={String(priority)}
          onChange={(e) => setPriority(Number(e.target.value))}
          options={PRIORITY_KEYS.map((key, i) => ({
            value: String(i),
            label: t(`production.priorities.${key}`),
          }))}
        />

        <TextInput
          label={t('production.assignedTo')}
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder=""
        />

        <TextInput
          label={t('production.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder=""
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={!recipeId || createBatch.isPending}>
            {t('common.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
