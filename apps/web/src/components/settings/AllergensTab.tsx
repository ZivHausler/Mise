import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, Tag,
  Milk, Wheat, Nut,
  Egg, Bean, Coffee, Wine,
  Fish, Shell,
  type LucideIcon,
} from 'lucide-react';
import { Card, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Feedback';
import { useAllergens, useCreateAllergen, useUpdateAllergen, useDeleteAllergen } from '@/api/hooks';
import { PRESET_COLORS } from '@/constants/defaults';

interface AllergenItem {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Milk,
  Wheat,
  Nut,
  Egg,
  Bean,
  Fish, Shell,
  Coffee,
  Wine,
};

const DEFAULT_ICON_NAMES = new Set(['Milk', 'Wheat', 'Nut']);

export const ALLERGEN_ICONS: { name: string; Icon: LucideIcon }[] = Object.entries(ICON_MAP)
  .filter(([name]) => !DEFAULT_ICON_NAMES.has(name))
  .map(([name, Icon]) => ({ name, Icon }));

function AllergenIcon({ icon, color, size = 14 }: { icon: string | null; color: string | null; size?: number }) {
  if (!icon) return <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color || '#94A3B8' }} />;
  const Icon = ICON_MAP[icon];
  if (!Icon) return <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color || '#94A3B8' }} />;
  return <Icon className="shrink-0" style={{ color: color || '#94A3B8' }} size={size} />;
}

function useAllergenName() {
  const { t } = useTranslation();
  return (allergen: { name: string; isDefault?: boolean }) =>
    allergen.isDefault ? t(`settings.allergens.defaultNames.${allergen.name}`, allergen.name) : allergen.name;
}

export { ICON_MAP, AllergenIcon, useAllergenName };

export default function AllergensTab() {
  const { t } = useTranslation();
  const getAllergenName = useAllergenName();
  const { data: allergens, isLoading } = useAllergens();
  const createAllergen = useCreateAllergen();
  const updateAllergen = useUpdateAllergen();
  const deleteAllergen = useDeleteAllergen();

  const [showModal, setShowModal] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState<AllergenItem | null>(null);
  const [form, setForm] = useState({ name: '', color: '', icon: '' });

  const allergenList = (allergens ?? []) as AllergenItem[];
  const defaultAllergens = allergenList.filter((g) => g.isDefault);
  const userAllergens = allergenList.filter((g) => !g.isDefault);

  const openCreate = () => {
    setEditingAllergen(null);
    setForm({ name: '', color: '', icon: '' });
    setShowModal(true);
  };

  const openEdit = (allergen: AllergenItem) => {
    setEditingAllergen(allergen);
    setForm({ name: allergen.name, color: allergen.color ?? '', icon: allergen.icon ?? '' });
    setShowModal(true);
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      icon: form.icon || null,
      color: form.color || null,
    };
    if (editingAllergen) {
      updateAllergen.mutate({ id: editingAllergen.id, ...payload }, { onSuccess: () => setShowModal(false) });
    } else {
      createAllergen.mutate(payload, { onSuccess: () => setShowModal(false) });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={4}>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {t('settings.allergens.add', 'Add Allergen')}
        </Button>
      </div>

      {/* Default allergens */}
      {defaultAllergens.length > 0 && (
        <Card>
          <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-neutral-400">
            {t('settings.allergens.defaults', 'Defaults')}
          </p>
          <Stack gap={1}>
            {defaultAllergens.map((allergen) => (
              <div key={String(allergen.id)} className="flex items-center justify-between rounded-md px-3 py-2.5">
                <span className="flex items-center gap-3">
                  <AllergenIcon icon={allergen.icon} color={allergen.color} />
                  <span className="text-body-sm font-medium text-neutral-800">{getAllergenName(allergen)}</span>
                </span>
              </div>
            ))}
          </Stack>
        </Card>
      )}

      {/* User allergens */}
      {userAllergens.length > 0 ? (
        <Card>
          <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-neutral-400">
            {t('settings.allergens.custom', 'Custom')}
          </p>
          <Stack gap={1}>
            {userAllergens.map((allergen) => (
              <div key={String(allergen.id)} className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-neutral-50">
                <span className="flex items-center gap-3">
                  <AllergenIcon icon={allergen.icon} color={allergen.color} />
                  <span className="text-body-sm font-medium text-neutral-800">{allergen.name}</span>
                </span>
                <span className="flex gap-1">
                  <button onClick={() => openEdit(allergen)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteAllergen.mutate(allergen.id)} className="rounded p-1 text-neutral-400 hover:bg-accent-100 hover:text-accent-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </Stack>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8">
            <Tag className="h-10 w-10 text-neutral-300" />
            <p className="text-body-sm text-neutral-500">{t('settings.allergens.empty', 'No custom allergens yet.')}</p>
            <p className="text-caption text-neutral-400">{t('settings.allergens.emptyDesc', 'Create allergens to tag and organize items.')}</p>
          </div>
        </Card>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleSubmit}
        title={editingAllergen ? t('settings.allergens.edit', 'Edit Allergen') : t('settings.allergens.add', 'Add Allergen')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSubmit} loading={createAllergen.isPending || updateAllergen.isPending} disabled={!form.name}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Stack gap={3}>
          <TextInput label={t('settings.allergens.name', 'Name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('settings.allergens.namePlaceholder', 'e.g. Dairy-free')} />
          <div>
            <label className="mb-1 block text-body-sm font-semibold text-neutral-700">{t('settings.allergens.icon', 'Icon')}</label>
            <div className="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto">
              {ALLERGEN_ICONS.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: f.icon === name ? '' : name }))}
                  className={`flex items-center justify-center h-9 w-full rounded-md border-2 transition-colors ${form.icon === name ? 'border-neutral-800 bg-neutral-100' : 'border-transparent hover:bg-neutral-50'}`}
                >
                  <Icon className="h-4.5 w-4.5 text-neutral-600" size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-semibold text-neutral-700">{t('settings.allergens.color', 'Color')}</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: f.color === c ? '' : c }))}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-neutral-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </Stack>
      </Modal>
    </Stack>
  );
}
