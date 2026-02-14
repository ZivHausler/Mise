import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Package } from 'lucide-react';
import { Page, PageHeader, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, StatusBadge, EmptyState, type Column } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { Modal } from '@/components/Modal';
import { TextInput, NumberInput, Select } from '@/components/FormFields';
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem } from '@/api/hooks';

function getStockStatus(stock: number, threshold: number): 'good' | 'ok' | 'low' | 'out' {
  if (stock === 0) return 'out';
  if (stock <= threshold) return 'low';
  if (stock <= threshold * 2) return 'ok';
  return 'good';
}

const stockLabel: Record<string, string> = { good: 'Good', ok: 'OK', low: 'Low', out: 'Out' };

export default function InventoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: inventory, isLoading } = useInventory();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const [showAdd, setShowAdd] = useState(false);
  const [showAdjust, setShowAdjust] = useState<any>(null);

  const [newItem, setNewItem] = useState({ name: '', category: '', unit: 'kg', stock: '' as number | '', threshold: '' as number | '', costPerUnit: '' as number | '' });
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustType, setAdjustType] = useState('add');

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'name', header: t('inventory.name', 'Name'), sortable: true },
      { key: 'category', header: t('inventory.category', 'Category'), sortable: true },
      { key: 'stock', header: t('inventory.stock', 'Stock'), sortable: true, align: 'end' as const, render: (row: any) => <span className="font-mono">{row.stock}</span> },
      { key: 'unit', header: t('inventory.unit', 'Unit') },
      {
        key: 'status',
        header: t('inventory.status', 'Status'),
        align: 'center' as const,
        render: (row: any) => {
          const status = getStockStatus(row.stock ?? 0, row.threshold ?? 5);
          return <StatusBadge variant={status} label={stockLabel[status]} />;
        },
      },
      {
        key: 'actions',
        header: '',
        align: 'end' as const,
        render: (row: any) => (
          <Button size="sm" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowAdjust(row); }}>
            {t('inventory.adjust', 'Adjust')}
          </Button>
        ),
      },
    ],
    [t]
  );

  const handleAddItem = useCallback(() => {
    createItem.mutate(newItem, {
      onSuccess: () => {
        setShowAdd(false);
        setNewItem({ name: '', category: '', unit: 'kg', stock: '', threshold: '', costPerUnit: '' });
      },
    });
  }, [newItem, createItem]);

  const handleAdjust = useCallback(() => {
    if (!showAdjust || adjustAmount === '') return;
    const newStock =
      adjustType === 'add'
        ? (showAdjust.stock ?? 0) + adjustAmount
        : adjustType === 'use'
          ? Math.max(0, (showAdjust.stock ?? 0) - adjustAmount)
          : adjustAmount;
    updateItem.mutate(
      { id: showAdjust.id, stock: newStock },
      {
        onSuccess: () => {
          setShowAdjust(null);
          setAdjustAmount('');
        },
      }
    );
  }, [showAdjust, adjustAmount, adjustType, updateItem]);

  if (isLoading) return <PageLoading />;

  const items = (inventory as any[]) ?? [];

  return (
    <Page>
      <PageHeader
        title={t('nav.inventory')}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            {t('inventory.addItem', 'Add Item')}
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title={t('inventory.empty', 'No inventory items')}
          description={t('inventory.emptyDesc', 'Add ingredients and supplies to track stock levels.')}
          icon={<Package className="h-16 w-16" />}
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
              {t('inventory.addItem', 'Add Item')}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => navigate(`/inventory/${row.id}`)}
          searchable
          searchPlaceholder={t('inventory.searchPlaceholder', 'Search inventory...')}
        />
      )}

      {/* Add Item Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('inventory.addItem', 'Add Item')} size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleAddItem} loading={createItem.isPending}>{t('common.save')}</Button>
          </>
        }
      >
        <Stack gap={4}>
          <TextInput label={t('inventory.name', 'Name')} value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required dir="auto" />
          <TextInput label={t('inventory.category', 'Category')} value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} dir="auto" />
          <Select label={t('inventory.unit', 'Unit')} options={[{ value: 'kg', label: 'kg' }, { value: 'g', label: 'g' }, { value: 'l', label: 'l' }, { value: 'ml', label: 'ml' }, { value: 'pcs', label: 'pcs' }]} value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
          <NumberInput label={t('inventory.stock', 'Initial Stock')} value={newItem.stock} onChange={(v) => setNewItem({ ...newItem, stock: v })} min={0} />
          <NumberInput label={t('inventory.threshold', 'Low-Stock Threshold')} value={newItem.threshold} onChange={(v) => setNewItem({ ...newItem, threshold: v })} min={0} />
          <NumberInput label={t('inventory.costPerUnit', 'Cost per Unit (NIS)')} value={newItem.costPerUnit} onChange={(v) => setNewItem({ ...newItem, costPerUnit: v })} min={0} step={0.01} />
        </Stack>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={!!showAdjust} onClose={() => setShowAdjust(null)} title={`${t('inventory.adjust', 'Adjust Stock')}: ${showAdjust?.name ?? ''}`} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdjust(null)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleAdjust} loading={updateItem.isPending}>{t('common.confirm')}</Button>
          </>
        }
      >
        <Stack gap={4}>
          <Select
            label={t('inventory.adjustType', 'Type')}
            options={[{ value: 'add', label: 'Add' }, { value: 'use', label: 'Use' }, { value: 'set', label: 'Set' }]}
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value)}
          />
          <NumberInput label={t('inventory.amount', 'Amount')} value={adjustAmount} onChange={setAdjustAmount} min={0} />
        </Stack>
      </Modal>
    </Page>
  );
}
