import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { Card, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Feedback';
import { TranslateButton } from '@/components/TranslateButton';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/api/hooks';

interface CategoryItem {
  id: number;
  name: string;
  nameEn: string | null;
}

export default function CategoriesTab() {
  const { t } = useTranslation();
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');

  const categoryList = (categories ?? []) as CategoryItem[];

  const openCreate = () => {
    setEditingCategory(null);
    setName('');
    setNameEn('');
    setShowModal(true);
  };

  const openEdit = (category: CategoryItem) => {
    setEditingCategory(category);
    setName(category.name);
    setNameEn(category.nameEn ?? '');
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, name, nameEn: nameEn || null }, { onSuccess: () => setShowModal(false) });
    } else {
      createCategory.mutate({ name, nameEn: nameEn || null }, { onSuccess: () => setShowModal(false) });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={4}>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {t('settings.categories.add', 'Add Category')}
        </Button>
      </div>

      {categoryList.length > 0 ? (
        <Card>
          <Stack gap={1}>
            {categoryList.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-neutral-50">
                <span className="flex items-center gap-3">
                  <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-body-sm font-medium text-neutral-800">
                    {category.name}
                    {category.nameEn && <span className="text-neutral-400 ms-2" dir="ltr">({category.nameEn})</span>}
                  </span>
                </span>
                <span className="flex gap-1">
                  <button onClick={() => openEdit(category)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteCategory.mutate(category.id)} className="rounded p-1 text-neutral-400 hover:bg-accent-100 hover:text-accent-600">
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
            <FolderOpen className="h-10 w-10 text-neutral-300" />
            <p className="text-body-sm text-neutral-500">{t('settings.categories.empty', 'No categories yet.')}</p>
            <p className="text-caption text-neutral-400">{t('settings.categories.emptyDesc', 'Create categories to organize your recipes.')}</p>
          </div>
        </Card>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleSubmit}
        title={editingCategory ? t('settings.categories.edit', 'Edit Category') : t('settings.categories.add', 'Add Category')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSubmit} loading={createCategory.isPending || updateCategory.isPending} disabled={!name.trim()}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Stack gap={3}>
          <TextInput
            label={t('settings.categories.name', 'Name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('settings.categories.namePlaceholder', 'e.g. Cakes, Breads, Pastries')}
          />
          <TextInput
            label={`${t('settings.categories.nameEn', 'Name (English)')} (${t('common.optional')})`}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Cakes, Breads, Pastries"
            dir="ltr"
          />
          <TranslateButton
            hebrewText={name}
            onTranslate={setNameEn}
            fieldType="name"
            className="self-end -mt-1"
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
