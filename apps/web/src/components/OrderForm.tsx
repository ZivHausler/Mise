import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { Stack, Row } from '@/components/Layout';
import { TextArea, DatePicker, NumberInput, Select } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { NewCustomerModal } from '@/components/NewCustomerModal';
import { useCreateOrder, useCreateRecurringOrder, useUpdateOrder, useUpdateRecurringOrders, useCustomers, useRecipes } from '@/api/hooks';
import { useFormatDate } from '@/utils/dateFormat';

interface OrderItem {
  recipeId: string;
  recipeName: string;
  quantity: number;
  price: number;
  basePrice: number;
}

interface OrderFormProps {
  /** Existing order data when editing */
  existingOrder?: any;
  /** Pre-filled due date (YYYY-MM-DD) */
  defaultDueDate?: string;
  /** Called after successful create/update */
  onSuccess?: (order: any) => void;
  /** Called when cancel is pressed */
  onCancel: () => void;
}

export function OrderForm({ existingOrder, defaultDueDate, onSuccess, onCancel }: OrderFormProps) {
  const isEdit = !!existingOrder;
  const { t } = useTranslation();
  const { data: customers } = useCustomers();
  const { data: recipes } = useRecipes();
  const createOrder = useCreateOrder();
  const createRecurringOrder = useCreateRecurringOrder();
  const updateOrder = useUpdateOrder();
  const updateRecurringOrders = useUpdateRecurringOrders();
  const formatDate = useFormatDate();

  const o = existingOrder as any;

  const [customerId, setCustomerId] = useState(o?.customer?.id ?? '');
  const [dueDate, setDueDate] = useState(o?.dueDate ?? defaultDueDate ?? '');
  const [notes, setNotes] = useState(o?.notes ?? '');
  const [items, setItems] = useState<OrderItem[]>(
    o?.items?.length
      ? o.items.map((item: any) => ({ ...item, basePrice: item.basePrice ?? item.price ?? 0 }))
      : [{ recipeId: '', recipeName: '', quantity: 1, price: 0, basePrice: 0 }]
  );

  const [showNewCustomer, setShowNewCustomer] = useState(false);

  // Recurring order state (create mode only)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringEndDate, setRecurringEndDate] = useState('');

  const customerOptions = ((customers as any[]) ?? []).map((c: any) => ({ value: c.id, label: c.name }));
  const recipeOptions = ((recipes as any[]) ?? []).map((r: any) => ({ value: r.id, label: r.name }));

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { recipeId: '', recipeName: '', quantity: 1, price: 0, basePrice: 0 }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, field: keyof OrderItem, value: unknown) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'recipeId') {
          const recipe = ((recipes as any[]) ?? []).find((r: any) => r.id === value);
          if (recipe) {
            updated.recipeName = recipe.name;
            updated.basePrice = recipe.sellingPrice ?? 0;
            updated.price = recipe.sellingPrice ?? 0;
          }
        }
        return updated;
      })
    );
  }, [recipes]);

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const minDueDate = useMemo(() => {
    const recipeList = (recipes as any[]) ?? [];
    let maxPrepMinutes = 0;
    for (const item of items) {
      if (!item.recipeId) continue;
      const recipe = recipeList.find((r: any) => r.id === item.recipeId);
      if (!recipe?.steps) continue;
      const totalMinutes = (recipe.steps as any[]).reduce((sum: number, s: any) => sum + (s.duration ?? 0), 0);
      if (totalMinutes > maxPrepMinutes) maxPrepMinutes = totalMinutes;
    }
    const prepDays = Math.ceil(maxPrepMinutes / (24 * 60));
    const min = new Date();
    min.setDate(min.getDate() + prepDays);
    return min.toISOString().split('T')[0]!;
  }, [items, recipes]);

  const [showPrepWarning, setShowPrepWarning] = useState(false);
  const [showRecurringEditDialog, setShowRecurringEditDialog] = useState(false);
  const pendingSubmit = useRef(false);

  const doUpdateThisOnly = useCallback(() => {
    const body = { customerId, dueDate, notes, items, total };
    updateOrder.mutate({ id: o.id, ...body }, { onSuccess: (data: any) => onSuccess?.(data) });
  }, [customerId, dueDate, notes, items, total, o?.id, updateOrder, onSuccess]);

  const doUpdateAllFuture = useCallback(() => {
    const body = { customerId, dueDate, notes, items, total };
    updateRecurringOrders.mutate({ id: o.id, ...body }, { onSuccess: (data: any) => onSuccess?.(data) });
  }, [customerId, dueDate, notes, items, total, o?.id, updateRecurringOrders, onSuccess]);

  const submitOrder = useCallback(() => {
    const body = { customerId, dueDate, notes, items, total };
    if (isEdit) {
      if (o?.recurringGroupId) {
        setShowRecurringEditDialog(true);
        return;
      }
      updateOrder.mutate({ id: o.id, ...body }, { onSuccess: (data: any) => onSuccess?.(data) });
    } else if (isRecurring && recurringDays.length > 0 && recurringEndDate) {
      const recurringBody = { ...body, recurrence: { frequency: 'weekly' as const, daysOfWeek: recurringDays, endDate: recurringEndDate } };
      createRecurringOrder.mutate(recurringBody, { onSuccess: (data: any) => onSuccess?.(data) });
    } else {
      createOrder.mutate(body, { onSuccess: (data: any) => onSuccess?.(data) });
    }
  }, [customerId, dueDate, notes, items, total, isEdit, o?.id, o?.recurringGroupId, isRecurring, recurringDays, recurringEndDate, createOrder, createRecurringOrder, updateOrder, onSuccess]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const today = new Date().toISOString().split('T')[0]!;
      if (dueDate && minDueDate > today && dueDate < minDueDate) {
        setShowPrepWarning(true);
        return;
      }
      submitOrder();
    },
    [dueDate, minDueDate, submitOrder]
  );

  const confirmPrepWarning = useCallback(() => {
    setShowPrepWarning(false);
    submitOrder();
  }, [submitOrder]);

  const isPending = createOrder.isPending || createRecurringOrder.isPending || updateOrder.isPending || updateRecurringOrders.isPending;

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Row gap={2} className="items-end">
            <Select
              label={t('orders.customer', 'Customer')}
              options={customerOptions}
              placeholder={t('orders.selectCustomer', 'Select customer...')}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="button" variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowNewCustomer(true)}>
              {t('customers.create', 'New Customer')}
            </Button>
          </Row>
          <DatePicker
            label={t('orders.dueDate', 'Due Date')}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            hint={dueDate && minDueDate > new Date().toISOString().split('T')[0]! && dueDate < minDueDate
              ? <span className="text-red-500">{t('orders.dueDateHint', 'Earliest possible date based on preparation time: {{date}}', { date: formatDate(minDueDate + 'T00:00:00') })}</span>
              : undefined}
            required
            className="max-w-xs"
          />

          {!isEdit && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer text-body-sm font-semibold text-neutral-700">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => {
                    setIsRecurring(e.target.checked);
                    if (e.target.checked && dueDate && recurringDays.length === 0) {
                      const dayOfWeek = new Date(dueDate + 'T00:00:00').getDay();
                      setRecurringDays([dayOfWeek]);
                    }
                  }}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                {t('orders.recurring', 'Recurring order')}
              </label>

              {isRecurring && (
                <div className="mt-3 space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                  <div>
                    <label className="mb-1 block text-body-sm font-medium text-neutral-600 dark:text-neutral-300">
                      {t('orders.recurringDays', 'Repeat on')}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).map((day, idx) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setRecurringDays((prev) =>
                              prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
                            );
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            recurringDays.includes(idx)
                              ? 'bg-primary-600 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
                          }`}
                        >
                          {t(`weekdays.${day}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DatePicker
                    label={t('orders.recurringEnd', 'Until')}
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    min={dueDate || undefined}
                    required={isRecurring}
                    className="max-w-xs"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-2 block text-body-sm font-semibold text-neutral-700">{t('orders.items', 'Items')}</label>
            <Stack gap={4}>
              {items.map((item, i) => (
                <div key={i} className="flex flex-col md:flex-row md:items-end gap-3 rounded-lg shadow-[0_0_8px_rgba(0,0,0,0.09)] p-3">
                  <Select
                    options={recipeOptions.filter((opt) => opt.value === item.recipeId || !items.some((other, idx) => idx !== i && other.recipeId === opt.value))}
                    placeholder={t('orders.selectRecipe', 'Recipe...')}
                    value={item.recipeId}
                    onChange={(e) => updateItem(i, 'recipeId', e.target.value)}
                    className="flex-1"
                  />
                  <Row gap={3} className="items-end">
                    <NumberInput
                      label={t('orders.qty', 'Qty')}
                      value={item.quantity}
                      onChange={(v) => updateItem(i, 'quantity', v || 1)}
                      min={1}
                      disabled={!item.recipeId}
                      className="flex-1 md:flex-none md:w-20"
                    />
                    <NumberInput
                      label={<span className="flex items-center gap-1">{t('orders.price', 'Price')} <span className="text-caption text-neutral-400 font-normal">{t('orders.perUnit', '(per unit)')}</span>{item.recipeId && item.price !== item.basePrice && <span className={`text-caption font-medium ${item.price > item.basePrice ? 'text-success' : 'text-error'}`}>{item.price > item.basePrice ? '+' : ''}{Math.round((item.price - item.basePrice) * 100) / 100} {t('common.currency')}</span>}</span>}
                      value={item.price}
                      onChange={(v) => updateItem(i, 'price', v || 0)}
                      min={0}
                      disabled={!item.recipeId}
                      className="flex-1 md:flex-none md:w-32"
                    />
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
                        <Trash2 className="h-4 w-4 text-neutral-400" />
                      </Button>
                    )}
                  </Row>
                </div>
              ))}
              <Button type="button" variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addItem} className="self-center">
                {t('orders.addItem', 'Add Item')}
              </Button>
            </Stack>
            <div className="mt-3 text-end text-body-sm font-semibold text-neutral-800">
              {t('orders.total', 'Total')}: <span className="font-mono">{total} {t('common.currency')}</span>
            </div>
          </div>

          <TextArea
            label={t('orders.notes', 'Notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            dir="auto"
          />

          <Row gap={2} className="justify-end">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={isPending} disabled={!items.some((item) => item.recipeId)}>
              {t('common.save')}
            </Button>
          </Row>
        </Stack>
      </form>
      <NewCustomerModal open={showNewCustomer} onClose={() => setShowNewCustomer(false)} onCreated={(customer) => { if (customer?.id) setCustomerId(customer.id); }} allowUseExisting />

      {showPrepWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPrepWarning(false)}>
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-neutral-800 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {t('orders.prepWarningTitle', 'Due date may be too early')}
            </h2>
            <p className="mb-5 text-body-sm text-neutral-600 dark:text-neutral-300">
              {t('orders.prepWarningMessage', 'The items in this order require preparation time and may not be ready by {{date}}. The earliest recommended date is {{minDate}}.', {
                date: formatDate(dueDate + 'T00:00:00'),
                minDate: formatDate(minDueDate + 'T00:00:00'),
              })}
            </p>
            <Row gap={2} className="justify-end">
              <Button variant="secondary" onClick={() => setShowPrepWarning(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={confirmPrepWarning}>
                {t('orders.prepWarningConfirm', 'Continue anyway')}
              </Button>
            </Row>
          </div>
        </div>
      )}

      {showRecurringEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRecurringEditDialog(false)}>
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-neutral-800 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {t('orders.recurringEditTitle', 'Update recurring order')}
            </h2>
            <p className="mb-5 text-body-sm text-neutral-600 dark:text-neutral-300">
              {t('orders.recurringEditMessage', 'This order is part of a recurring series. Would you like to update only this order, or this and all future orders in the series?')}
            </p>
            <Row gap={2} className="justify-end">
              <Button variant="secondary" onClick={() => setShowRecurringEditDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="secondary" onClick={() => { setShowRecurringEditDialog(false); doUpdateThisOnly(); }}>
                {t('orders.recurringEditThisOnly', 'This order only')}
              </Button>
              <Button variant="primary" onClick={() => { setShowRecurringEditDialog(false); doUpdateAllFuture(); }}>
                {t('orders.recurringEditAllFuture', 'This & future orders')}
              </Button>
            </Row>
          </div>
        </div>
      )}
    </>
  );
}
