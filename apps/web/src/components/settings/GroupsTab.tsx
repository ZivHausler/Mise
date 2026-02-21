import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, Tag,
  Milk, Wheat, Nut,
  type LucideIcon,
} from 'lucide-react';
import { Card, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Feedback';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/api/hooks';
import { PRESET_COLORS } from '@/constants/defaults';

interface GroupItem {
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
};

function GroupIcon({ icon, color, size = 14 }: { icon: string | null; color: string | null; size?: number }) {
  if (!icon) return <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color || '#94A3B8' }} />;
  const Icon = ICON_MAP[icon];
  if (!Icon) return <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color || '#94A3B8' }} />;
  return <Icon className="shrink-0" style={{ color: color || '#94A3B8' }} size={size} />;
}

function useGroupName() {
  const { t } = useTranslation();
  return (group: { name: string; isDefault?: boolean }) =>
    group.isDefault ? t(`settings.groups.defaultNames.${group.name}`, group.name) : group.name;
}

export { ICON_MAP, GroupIcon, useGroupName };

export default function GroupsTab() {
  const { t } = useTranslation();
  const getGroupName = useGroupName();
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [form, setForm] = useState({ name: '', color: '' });

  const groupList = (groups ?? []) as GroupItem[];
  const defaultGroups = groupList.filter((g) => g.isDefault);
  const userGroups = groupList.filter((g) => !g.isDefault);

  const openCreate = () => {
    setEditingGroup(null);
    setForm({ name: '', color: '' });
    setShowModal(true);
  };

  const openEdit = (group: GroupItem) => {
    setEditingGroup(group);
    setForm({ name: group.name, color: group.color ?? '' });
    setShowModal(true);
  };

  const handleSubmit = () => {
    const payload = { name: form.name, ...(form.color ? { color: form.color } : {}) };
    if (editingGroup) {
      updateGroup.mutate({ id: editingGroup.id, ...payload }, { onSuccess: () => setShowModal(false) });
    } else {
      createGroup.mutate(payload, { onSuccess: () => setShowModal(false) });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={4}>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {t('settings.groups.add', 'Add Group')}
        </Button>
      </div>

      {/* Default groups */}
      {defaultGroups.length > 0 && (
        <Card>
          <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-neutral-400">
            {t('settings.groups.defaults', 'Defaults')}
          </p>
          <Stack gap={1}>
            {defaultGroups.map((group) => (
              <div key={String(group.id)} className="flex items-center justify-between rounded-md px-3 py-2.5">
                <span className="flex items-center gap-3">
                  <GroupIcon icon={group.icon} color={group.color} />
                  <span className="text-body-sm font-medium text-neutral-800">{getGroupName(group)}</span>
                </span>
              </div>
            ))}
          </Stack>
        </Card>
      )}

      {/* User groups */}
      {userGroups.length > 0 ? (
        <Card>
          <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-neutral-400">
            {t('settings.groups.custom', 'Custom')}
          </p>
          <Stack gap={1}>
            {userGroups.map((group) => (
              <div key={String(group.id)} className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-neutral-50">
                <span className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color || '#94A3B8' }}
                  />
                  <span className="text-body-sm font-medium text-neutral-800">{group.name}</span>
                </span>
                <span className="flex gap-1">
                  <button onClick={() => openEdit(group)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteGroup.mutate(group.id)} className="rounded p-1 text-neutral-400 hover:bg-accent-100 hover:text-accent-600">
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
            <p className="text-body-sm text-neutral-500">{t('settings.groups.empty', 'No custom groups yet.')}</p>
            <p className="text-caption text-neutral-400">{t('settings.groups.emptyDesc', 'Create groups to tag and organize items.')}</p>
          </div>
        </Card>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingGroup ? t('settings.groups.edit', 'Edit Group') : t('settings.groups.add', 'Add Group')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSubmit} loading={createGroup.isPending || updateGroup.isPending} disabled={!form.name}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Stack gap={3}>
          <TextInput label={t('settings.groups.name', 'Name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('settings.groups.namePlaceholder', 'e.g. Dairy-free')} />
          <div>
            <label className="mb-1 block text-body-sm font-semibold text-neutral-700">{t('settings.groups.color', 'Color')}</label>
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
