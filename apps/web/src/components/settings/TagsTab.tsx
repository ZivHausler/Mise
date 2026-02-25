import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Card, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Feedback';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/api/hooks';

interface TagItem {
  id: number;
  name: string;
}

export default function TagsTab() {
  const { t } = useTranslation();
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [name, setName] = useState('');

  const tagList = (tags ?? []) as TagItem[];

  const openCreate = () => {
    setEditingTag(null);
    setName('');
    setShowModal(true);
  };

  const openEdit = (tag: TagItem) => {
    setEditingTag(tag);
    setName(tag.name);
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingTag) {
      updateTag.mutate({ id: editingTag.id, name }, { onSuccess: () => setShowModal(false) });
    } else {
      createTag.mutate({ name }, { onSuccess: () => setShowModal(false) });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={4}>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {t('settings.tags.add', 'Add Tag')}
        </Button>
      </div>

      {tagList.length > 0 ? (
        <Card>
          <Stack gap={1}>
            {tagList.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-neutral-50">
                <span className="flex items-center gap-3">
                  <Tag className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-body-sm font-medium text-neutral-800">{tag.name}</span>
                </span>
                <span className="flex gap-1">
                  <button onClick={() => openEdit(tag)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteTag.mutate(tag.id)} className="rounded p-1 text-neutral-400 hover:bg-accent-100 hover:text-accent-600">
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
            <p className="text-body-sm text-neutral-500">{t('settings.tags.empty', 'No tags yet.')}</p>
            <p className="text-caption text-neutral-400">{t('settings.tags.emptyDesc', 'Create tags to organize your recipes.')}</p>
          </div>
        </Card>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleSubmit}
        title={editingTag ? t('settings.tags.edit', 'Edit Tag') : t('settings.tags.add', 'Add Tag')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSubmit} loading={createTag.isPending || updateTag.isPending} disabled={!name.trim()}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <TextInput
          label={t('settings.tags.name', 'Name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('settings.tags.namePlaceholder', 'e.g. Dairy, Cake, Hot')}
        />
      </Modal>
    </Stack>
  );
}
