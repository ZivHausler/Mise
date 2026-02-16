import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Package, SlidersHorizontal, Trash2, Pencil, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { GroupIcon } from '@/components/settings/GroupsTab';
import { Page, PageHeader, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, StatusBadge, EmptyState, type Column } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { Modal } from '@/components/Modal';
import { TextInput, NumberInput, Select } from '@/components/FormFields';
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, useAdjustStock, useGroups, type PaginationInfo } from '@/api/hooks';

function getStockStatus(stock: number, threshold: number): 'good' | 'ok' | 'low' | 'out' {
  if (stock === 0) return 'out';
  if (stock <= threshold) return 'low';
  if (stock <= threshold * 2) return 'ok';
  return 'good';
}

// stockLabel moved inside component to use t()

export default function InventoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const { data: inventoryData, isLoading } = useInventory(page, 10, debouncedSearch || undefined, selectedGroupIds.length ? selectedGroupIds : undefined);
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const adjustStock = useAdjustStock();
  const { data: groups } = useGroups();
  const [editingItem, setEditingItem] = useState<any>(null); // null = closed, 'new' = add, object = edit
  const [showAdjust, setShowAdjust] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<any>(null);

  const emptyItem = { name: '', category: '', unit: '', stock: '' as number | '', packageSize: '' as number | '', threshold: '' as number | '', costPerUnit: '' as number | '', groupIds: [] as string[] };
  const [newItem, setNewItem] = useState(emptyItem);
  const isEdit = editingItem !== null && editingItem !== 'new';
  const isModalOpen = editingItem !== null;
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustPrice, setAdjustPrice] = useState<number | ''>('');
  const [priceMode, setPriceMode] = useState<'unit' | 'amount'>('unit');
  const [priceInput, setPriceInput] = useState<number | ''>('');
  const [adjustType, setAdjustType] = useState('add');
  const [adjustInputMode, setAdjustInputMode] = useState<'units' | 'packages'>('units');

  // Debounce search and reset page on filter changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [selectedGroupIds]);

  const toggleGroup = useCallback((groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  }, []);

  const stockLabel: Record<string, string> = {
    good: t('inventory.statusGood', 'Good'),
    ok: t('inventory.statusOk', 'OK'),
    low: t('inventory.statusLow', 'Low'),
    out: t('inventory.statusOut', 'Out'),
  };

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'name', header: t('inventory.name', 'Name'), sortable: true, sticky: true },
      { key: 'groups', header: t('inventory.groups', 'Groups'), render: (row: any) => row.groups?.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.groups.map((g: any) => (
            <span key={g.id} title={g.name} className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 py-0.5 text-caption ${g.icon ? 'px-1.5' : 'px-2'}`}>
              <GroupIcon icon={g.icon ?? null} color={g.color ?? null} size={g.icon ? 14 : 10} />
              {!g.icon && g.name}
            </span>
          ))}
        </div>
      ) : <span className="text-neutral-300">—</span> },
      { key: 'quantity', header: t('inventory.stock', 'Stock'), sortable: true, align: 'end' as const, render: (row: any) => <span className="font-mono">{row.quantity}</span> },
      { key: 'unit', header: t('inventory.unit', 'Unit'), render: (row: any) => t(`common.units.${row.unit}`, row.unit) },
      { key: 'costPerUnit', header: t('inventory.costPerUnit', 'Cost p. Unit'), sortable: true, align: 'end' as const, render: (row: any) => <span className="font-mono">{row.costPerUnit}</span> },
      {
        key: 'status',
        header: t('inventory.status', 'Status'),
        align: 'center' as const,
        render: (row: any) => {
          const status = getStockStatus(row.quantity ?? 0, row.lowStockThreshold ?? 5);
          return <StatusBadge variant={status} label={stockLabel[status]} />;
        },
      },
      {
        key: 'actions',
        header: '',
        align: 'end' as const,
        shrink: true,
        render: (row: any) => (
          <div className="flex items-center">
            <Button size="sm" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditingItem(row); setNewItem({ name: row.name, category: row.category ?? '', groupIds: (row.groups ?? []).map((g: any) => g.id), threshold: row.lowStockThreshold ?? '', unit: row.unit ?? 'kg', costPerUnit: row.costPerUnit ?? '', stock: row.quantity ?? '', packageSize: row.packageSize ?? '' }); setPriceInput(row.packageSize && row.costPerUnit ? Math.round(row.costPerUnit * row.packageSize * 100) / 100 : row.costPerUnit ?? ''); setPriceMode('unit'); }} title={t('common.edit')}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowAdjust(row); }} title={t('inventory.adjust', 'Adjust')}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowDelete(row); }} title={t('common.delete')}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [t]
  );

  const closeModal = useCallback(() => {
    setEditingItem(null);
    setNewItem(emptyItem);
    setPriceInput('');
    setPriceMode('unit');
  }, []);

  const handleSaveItem = useCallback(() => {
    if (!newItem.name || newItem.packageSize === '' || priceInput === '') return;
    if (isEdit) {
      updateItem.mutate(
        { id: editingItem.id, name: newItem.name, category: newItem.category || undefined, groupIds: newItem.groupIds, lowStockThreshold: newItem.threshold, unit: newItem.unit, costPerUnit: newItem.costPerUnit, packageSize: newItem.packageSize },
        { onSuccess: closeModal },
      );
    } else {
      if (!newItem.unit) return;
      createItem.mutate(
        { name: newItem.name, category: newItem.category, unit: newItem.unit, quantity: 0, lowStockThreshold: newItem.threshold, costPerUnit: newItem.costPerUnit, packageSize: newItem.packageSize, groupIds: newItem.groupIds },
        { onSuccess: closeModal },
      );
    }
  }, [newItem, isEdit, editingItem, createItem, updateItem, closeModal]);

  const handleAdjust = useCallback(() => {
    if (!showAdjust || adjustAmount === '') return;
    const typeMap: Record<string, string> = { add: 'addition', use: 'usage' };
    const pkgSize = showAdjust.packageSize ?? 1;
    const realAmount = adjustInputMode === 'packages' && adjustType === 'add' ? (adjustAmount as number) * pkgSize : adjustAmount;
    const qty = adjustType === 'set' ? (realAmount as number) - (showAdjust.quantity ?? 0) : realAmount;
    const apiType = adjustType === 'set' ? ((qty as number) >= 0 ? 'addition' : 'usage') : (typeMap[adjustType] ?? 'adjustment');
    adjustStock.mutate(
      { ingredientId: showAdjust.id, type: apiType, quantity: Math.abs(qty as number), ...(adjustType === 'add' && adjustPrice !== '' ? { pricePaid: adjustPrice } : {}) },
      {
        onSuccess: () => {
          setShowAdjust(null);
          setAdjustAmount('');
          setAdjustPrice('');
          setAdjustInputMode('units');
        },
      }
    );
  }, [showAdjust, adjustAmount, adjustPrice, adjustType, adjustInputMode, adjustStock]);

  if (isLoading) return <PageLoading />;

  const items = (inventoryData?.items as any[]) ?? [];
  const pagination = inventoryData?.pagination;

  return (
    <Page>
      <PageHeader
        title={t('nav.inventory')}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingItem('new'); setNewItem(emptyItem); setPriceInput(''); setPriceMode('unit'); }}>
            {t('inventory.addItem', 'Add Item')}
          </Button>
        }
      />

      {items.length === 0 && page === 1 && !debouncedSearch && !selectedGroupIds.length ? (
        <EmptyState
          title={t('inventory.empty', 'No inventory items')}
          description={t('inventory.emptyDesc', 'Add ingredients and supplies to track stock levels.')}
          icon={<Package className="h-16 w-16" />}
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingItem('new'); setNewItem(emptyItem); setPriceInput(''); setPriceMode('unit'); }}>
              {t('inventory.addItem', 'Add Item')}
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs">
              <Search className="absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder={t('inventory.searchPlaceholder', 'Search inventory...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-neutral-200 bg-white ps-9 pe-3 text-body-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            {((groups ?? []) as { id: string; name: string; color?: string | null; icon?: string | null }[]).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {((groups ?? []) as { id: string; name: string; color?: string | null; icon?: string | null }[]).map((g) => {
                  const selected = selectedGroupIds.includes(g.id);
                  return (
                    <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption font-medium transition-colors ${selected ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}>
                      <GroupIcon icon={g.icon ?? null} color={g.color ?? null} size={selected && !g.icon ? 10 : g.icon ? 14 : 10} />
                      {!g.icon && g.name}
                      {g.icon && <span className="sr-only">{g.name}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <DataTable
            columns={columns}
            data={items}
            keyExtractor={(row: any) => row.id}
            onRowClick={(row: any) => { setEditingItem(row); setNewItem({ name: row.name, category: row.category ?? '', groupIds: (row.groups ?? []).map((g: any) => g.id), threshold: row.lowStockThreshold ?? '', unit: row.unit ?? 'kg', costPerUnit: row.costPerUnit ?? '', stock: row.quantity ?? '', packageSize: row.packageSize ?? '' }); setPriceInput(row.packageSize && row.costPerUnit ? Math.round(row.costPerUnit * row.packageSize * 100) / 100 : row.costPerUnit ?? ''); setPriceMode('unit'); }}
            bare
          />
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
              <span className="text-body-sm text-neutral-500">
                {t('common.showingOf', '{{from}}-{{to}} of {{total}}', {
                  from: (pagination.page - 1) * pagination.limit + 1,
                  to: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total,
                })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                </Button>
                <span className="text-body-sm text-neutral-700">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Item Modal */}
      <Modal open={isModalOpen} onClose={closeModal} title={isEdit ? t('inventory.editItem', 'Edit Item') : t('inventory.addItem', 'Add Item')} size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSaveItem} loading={isEdit ? updateItem.isPending : createItem.isPending} disabled={!newItem.name || newItem.packageSize === '' || priceInput === ''}>{t('common.save')}</Button>
          </>
        }
      >
        <Stack gap={4}>
          <TextInput label={t('inventory.name', 'Name')} value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required dir="auto" />
          <TextInput label={t('inventory.category', 'Category')} value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} dir="auto" />
          {((groups ?? []) as { id: string; name: string; color?: string | null }[]).length > 0 && (
            <div>
              <label className="mb-1 block text-body-sm font-semibold text-neutral-700">{t('inventory.groups', 'Groups')}</label>
              <div className="flex flex-wrap gap-2">
                {((groups ?? []) as { id: string; name: string; color?: string | null; icon?: string | null }[]).map((g) => {
                  const selected = newItem.groupIds.includes(g.id);
                  return (
                    <button key={g.id} type="button" onClick={() => setNewItem((prev) => ({ ...prev, groupIds: selected ? prev.groupIds.filter((id) => id !== g.id) : [...prev.groupIds, g.id] }))}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-body-sm transition-colors ${selected ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
                      <GroupIcon icon={g.icon ?? null} color={g.color ?? null} size={12} />
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <NumberInput label={t('inventory.packageSize', 'Package Size')} value={newItem.packageSize} onChange={(v) => setNewItem({ ...newItem, packageSize: v })} min={0} required />
            <Select label={t('inventory.unit', 'Unit')} options={[...(newItem.unit === '' ? [{ value: '', label: '—' }] : []), { value: 'kg', label: t('common.units.kg', 'kg') }, { value: 'g', label: t('common.units.g', 'g') }, { value: 'l', label: t('common.units.l', 'l') }, { value: 'ml', label: t('common.units.ml', 'ml') }, { value: 'pcs', label: t('common.units.pcs', 'pcs') }]} value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} required />
            <NumberInput label={t('inventory.packagePrice', 'Package Price (₪)')} value={priceInput} required onChange={(v) => {
              setPriceInput(v);
              const pkgSize = newItem.packageSize !== '' ? newItem.packageSize : 0;
              if (v !== '' && pkgSize > 0) {
                setNewItem((prev) => ({ ...prev, costPerUnit: Math.round((v / pkgSize) * 100) / 100 }));
              } else {
                setNewItem((prev) => ({ ...prev, costPerUnit: v }));
              }
            }} min={0} step={0.01} hint={priceInput !== '' && newItem.packageSize !== '' && (newItem.packageSize as number) > 0 ? `= ${Math.round(((priceInput as number) / (newItem.packageSize as number)) * 100) / 100} ₪/${t(`common.units.${newItem.unit}`, newItem.unit)}` : undefined} />
          </div>
          <NumberInput label={t('inventory.threshold', 'Low-Stock Threshold')} value={newItem.threshold} onChange={(v) => setNewItem({ ...newItem, threshold: v })} min={0} info={t('inventory.thresholdTooltip', 'You\'ll be alerted when stock drops to this level. At double this value, status shows as "OK".')} />
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title={t('inventory.deleteTitle', 'Delete Item?')} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDelete(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => { deleteItem.mutate(showDelete?.id, { onSuccess: () => setShowDelete(null) }); }} loading={deleteItem.isPending}>{t('common.delete')}</Button>
          </>
        }
      >
        <p>{t('inventory.deleteMsg', 'This item will be permanently deleted.')}</p>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={!!showAdjust} onClose={() => { setShowAdjust(null); setAdjustAmount(''); setAdjustPrice(''); setAdjustType('add'); setAdjustInputMode('units'); }} title={`${t('inventory.adjust', 'Adjust Stock')}: ${showAdjust?.name ?? ''}`} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAdjust(null); setAdjustAmount(''); setAdjustPrice(''); setAdjustType('add'); setAdjustInputMode('units'); }}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleAdjust} loading={adjustStock.isPending}>{t('common.confirm')}</Button>
          </>
        }
      >
        <Stack gap={4}>
          <Select
            label={t('inventory.adjustType', 'Type')}
            options={[{ value: 'add', label: t('inventory.adjustAdd', 'Add') }, { value: 'use', label: t('inventory.adjustUse', 'Use') }, { value: 'set', label: t('inventory.adjustSet', 'Set') }]}
            value={adjustType}
            onChange={(e) => { setAdjustType(e.target.value); setAdjustPrice(''); setAdjustInputMode('units'); setAdjustAmount(''); }}
          />
          {adjustType === 'add' && showAdjust?.packageSize > 0 && (
            <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
              <button type="button" onClick={() => { setAdjustInputMode('units'); setAdjustAmount(''); }} className={`flex-1 rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${adjustInputMode === 'units' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                {t(`common.units.${showAdjust?.unit}`, showAdjust?.unit ?? '')}
              </button>
              <button type="button" onClick={() => { setAdjustInputMode('packages'); setAdjustAmount(''); }} className={`flex-1 rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${adjustInputMode === 'packages' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                {t('inventory.packages', 'Packages')}
              </button>
            </div>
          )}
          <div className={`grid gap-3 ${adjustType === 'add' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <NumberInput
              label={adjustInputMode === 'packages' && adjustType === 'add' ? t('inventory.packages', 'Packages') : t('inventory.amount', 'Amount')}
              value={adjustAmount}
              onChange={setAdjustAmount}
              min={0}
              hint={adjustInputMode === 'packages' && adjustType === 'add' && adjustAmount !== '' && showAdjust?.packageSize ? `= ${(adjustAmount as number) * showAdjust.packageSize} ${t(`common.units.${showAdjust?.unit}`, showAdjust?.unit ?? '')}` : undefined}
            />
            {adjustType === 'add' && (
              <NumberInput label={t('inventory.pricePaid', 'Price Paid (₪)')} value={adjustPrice} onChange={setAdjustPrice} min={0} step={0.01} hint={adjustPrice !== '' && adjustAmount !== '' && (adjustAmount as number) > 0 ? (() => { const totalUnits = adjustInputMode === 'packages' ? (adjustAmount as number) * (showAdjust?.packageSize ?? 1) : (adjustAmount as number); return `= ${(Math.round(((adjustPrice as number) / totalUnits) * 100) / 100).toFixed(2)} ₪/${showAdjust?.unit ?? ''}`; })() : undefined} />
            )}
          </div>
        </Stack>
      </Modal>
    </Page>
  );
}
