import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { Page, Card, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TextArea, DatePicker, NumberInput, Select } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { NewCustomerModal } from '@/components/NewCustomerModal';
import { useCreateOrder, useUpdateOrder, useOrder, useCustomers, useRecipes } from '@/api/hooks';
import { useFormatDate } from '@/utils/dateFormat';

interface OrderItem {
  recipeId: string;
  recipeName: string;
  quantity: number;
  price: number;
  basePrice: number;
}

export default function OrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: existingOrder } = useOrder(id ?? '');
  const { data: customers } = useCustomers();
  const { data: recipes } = useRecipes();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();

  const formatDate = useFormatDate();
  const o = existingOrder as any;

  const [customerId, setCustomerId] = useState(o?.customerId ?? '');
  const [dueDate, setDueDate] = useState(o?.dueDate ?? '');
  const [notes, setNotes] = useState(o?.notes ?? '');
  const [items, setItems] = useState<OrderItem[]>(o?.items?.length ? o.items.map((item: any) => ({ ...item, basePrice: item.basePrice ?? item.price ?? 0 })) : [{ recipeId: '', recipeName: '', quantity: 1, price: 0, basePrice: 0 }]);

  const [showNewCustomer, setShowNewCustomer] = useState(false);

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
    return min.toISOString().split('T')[0];
  }, [items, recipes]);

  // Clear due date if it's now before the minimum (recipe changed)
  React.useEffect(() => {
    if (dueDate && dueDate < minDueDate) {
      setDueDate(minDueDate);
    }
  }, [minDueDate]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const body = { customerId, dueDate, notes, items, total };
      if (isEdit) {
        updateOrder.mutate({ id: id!, ...body }, { onSuccess: () => navigate(`/orders/${id}`) });
      } else {
        createOrder.mutate(body, { onSuccess: () => navigate('/orders') });
      }
    },
    [customerId, dueDate, notes, items, total, isEdit, id, createOrder, updateOrder, navigate]
  );

  const isPending = createOrder.isPending || updateOrder.isPending;

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: t('nav.orders'), path: '/orders' },
          { label: isEdit ? t('common.edit') : t('orders.create', 'New Order') },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Card>
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
              min={minDueDate}
              hint={minDueDate > new Date().toISOString().split('T')[0]
                ? t('orders.dueDateHint', 'Earliest possible date based on preparation time: {{date}}', { date: formatDate(minDueDate + 'T00:00:00') })
                : undefined}
              required
              className="max-w-xs"
            />

            <div>
              <label className="mb-2 block text-body-sm font-semibold text-neutral-700">{t('orders.items', 'Items')}</label>
              <Stack gap={3}>
                {items.map((item, i) => (
                  <Row key={i} gap={3} className="items-end">
                    <Select
                      options={recipeOptions.filter((opt) => opt.value === item.recipeId || !items.some((other, idx) => idx !== i && other.recipeId === opt.value))}
                      placeholder={t('orders.selectRecipe', 'Recipe...')}
                      value={item.recipeId}
                      onChange={(e) => updateItem(i, 'recipeId', e.target.value)}
                      className="flex-1"
                    />
                    <NumberInput
                      label={t('orders.qty', 'Qty')}
                      value={item.quantity}
                      onChange={(v) => updateItem(i, 'quantity', v || 1)}
                      min={1}
                      className="w-20"
                    />
                    <NumberInput
                      label={<span className="flex items-center justify-between">{t('orders.price', 'Price')}{item.recipeId && item.price !== item.basePrice && <span className={`text-caption font-medium ${item.price > item.basePrice ? 'text-success' : 'text-error'}`}>{item.price > item.basePrice ? '+' : ''}{Math.round((item.price - item.basePrice) * 100) / 100} {t('common.currency')}</span>}</span>}
                      value={item.price}
                      onChange={(v) => updateItem(i, 'price', v || 0)}
                      min={0}
                      className="w-28"
                    />
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
                        <Trash2 className="h-4 w-4 text-neutral-400" />
                      </Button>
                    )}
                  </Row>
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
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" loading={isPending} disabled={!items.some((item) => item.recipeId)}>
                {t('common.save')}
              </Button>
            </Row>
          </Stack>
        </Card>
      </form>
      <NewCustomerModal open={showNewCustomer} onClose={() => setShowNewCustomer(false)} onCreated={(customer) => { if (customer?.id) setCustomerId(customer.id); }} allowUseExisting />
    </Page>
  );
}
