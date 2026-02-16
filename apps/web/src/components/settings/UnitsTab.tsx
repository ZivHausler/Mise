import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { Card, Section, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { TextInput, NumberInput, Select } from '@/components/FormFields';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Feedback';
import { useUnits, useUnitCategories, useCreateUnit, useUpdateUnit, useDeleteUnit } from '@/api/hooks';

interface UnitItem {
  id: string;
  name: string;
  abbreviation: string;
  categoryId: string;
  categoryName?: string;
  conversionFactor: number;
  isDefault: boolean;
}

export default function UnitsTab() {
  const { t } = useTranslation();
  const { data: units, isLoading } = useUnits();
  const { data: categories } = useUnitCategories();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [form, setForm] = useState({ name: '', abbreviation: '', categoryId: '', conversionFactor: 1 as number | '' });

  const unitList = (units ?? []) as UnitItem[];
  const categoryList = (categories ?? []) as { id: string; name: string }[];

  const grouped = categoryList.map((cat) => ({
    ...cat,
    units: unitList.filter((u) => u.categoryId === cat.id),
  }));

  const openCreate = () => {
    setEditingUnit(null);
    setForm({ name: '', abbreviation: '', categoryId: categoryList[0]?.id ?? '', conversionFactor: 1 });
    setShowModal(true);
  };

  const openEdit = (unit: UnitItem) => {
    setEditingUnit(unit);
    setForm({ name: unit.name, abbreviation: unit.abbreviation, categoryId: unit.categoryId, conversionFactor: unit.conversionFactor });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingUnit) {
      updateUnit.mutate({ id: editingUnit.id, name: form.name, abbreviation: form.abbreviation, conversionFactor: form.conversionFactor }, { onSuccess: () => setShowModal(false) });
    } else {
      createUnit.mutate({ name: form.name, abbreviation: form.abbreviation, categoryId: form.categoryId, conversionFactor: form.conversionFactor }, { onSuccess: () => setShowModal(false) });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const categoryLabel = (name: string) => {
    const labels: Record<string, string> = { weight: t('settings.units.weight', 'Weight'), volume: t('settings.units.volume', 'Volume'), count: t('settings.units.count', 'Count') };
    return labels[name] || name.charAt(0).toUpperCase() + name.slice(1);
  };

  const baseUnitSuffix: Record<string, string> = { weight: 'gr', volume: 'ml' };

  const selectedCategoryName = categoryList.find((c) => c.id === form.categoryId)?.name ?? '';
  const showFactor = selectedCategoryName !== 'count';

  return (
    <Stack gap={4}>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {t('settings.units.add', 'Add Unit')}
        </Button>
      </div>

      {grouped.map((cat) => (
        <Card key={cat.id}>
          <Section title={categoryLabel(cat.name)}>
            {cat.units.length === 0 ? (
              <p className="text-body-sm text-neutral-400">{t('settings.units.noUnits', 'No units in this category.')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b bg-neutral-50">
                      <th className="px-3 py-2 text-start font-semibold">{t('settings.units.name', 'Name')}</th>
                      <th className="px-3 py-2 text-start font-semibold">{t('settings.units.abbr', 'Abbr.')}</th>
                      {cat.name !== 'count' && <th className="px-3 py-2 text-end font-semibold">{t('settings.units.factor', 'Factor')}</th>}
                      <th className="px-3 py-2 text-end font-semibold w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.units.map((unit) => (
                      <tr key={unit.id} className="border-b border-neutral-100">
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2">
                            {unit.name}
                            {unit.isDefault && <Lock className="h-3 w-3 text-neutral-400" />}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-600">{unit.abbreviation}</td>
                        {cat.name !== 'count' && (
                          <td className="px-3 py-2 text-end font-mono">
                            {unit.conversionFactor} <span className="text-neutral-400">{baseUnitSuffix[cat.name]}</span>
                          </td>
                        )}
                        <td className="px-3 py-2 text-end">
                          {!unit.isDefault && (
                            <span className="flex justify-end gap-1">
                              <button onClick={() => openEdit(unit)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => deleteUnit.mutate(unit.id)} className="rounded p-1 text-neutral-400 hover:bg-accent-100 hover:text-accent-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </Card>
      ))}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingUnit ? t('settings.units.edit', 'Edit Unit') : t('settings.units.add', 'Add Unit')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSubmit} loading={createUnit.isPending || updateUnit.isPending} disabled={!form.name || !form.abbreviation}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Stack gap={3}>
          {!editingUnit && (
            <Select
              label={t('settings.units.category', 'Category')}
              options={categoryList.map((c) => ({ value: c.id, label: categoryLabel(c.name) }))}
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            />
          )}
          <TextInput label={t('settings.units.name', 'Name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ounce" />
          <TextInput label={t('settings.units.abbr', 'Abbr.')} value={form.abbreviation} onChange={(e) => setForm((f) => ({ ...f, abbreviation: e.target.value }))} placeholder="e.g. oz" />
          {showFactor && (
            <NumberInput
              label={t('settings.units.factor', 'Conversion Factor')}
              value={form.conversionFactor}
              onChange={(v) => setForm((f) => ({ ...f, conversionFactor: v }))}
              suffix={baseUnitSuffix[selectedCategoryName]}
              info={t('settings.units.factorHint', `How many ${baseUnitSuffix[selectedCategoryName] ?? 'base units'} equal 1 of this unit`)}
            />
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
