import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Clock, ChefHat } from 'lucide-react';
import { Page, Card, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TextInput, TextArea, NumberInput, Select } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { useCreateRecipe, useUpdateRecipe, useRecipe, useRecipes, useInventory } from '@/api/hooks';
import { cn } from '@/utils/cn';

const categoryOptions = [
  { value: 'cakes', label: 'Cakes' },
  { value: 'breads', label: 'Breads' },
  { value: 'pastries', label: 'Pastries' },
  { value: 'cookies', label: 'Cookies' },
  { value: 'other', label: 'Other' },
];

type StepEntry =
  | { type: 'step'; instruction: string; duration: number | '' }
  | { type: 'sub_recipe'; recipeId: string; quantity: number | '' };

export default function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: existingRecipe } = useRecipe(id ?? '');
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();

  const { data: inventory } = useInventory();
  const inventoryItems = ((inventory as any[]) ?? []);

  const { data: allRecipes } = useRecipes();
  const recipeOptions = ((allRecipes as any[]) ?? [])
    .filter((rec: any) => rec.id !== id)
    .map((rec: any) => ({ value: rec.id, label: rec.name }));

  const r = existingRecipe as any;

  const [name, setName] = useState(r?.name ?? '');
  const [category, setCategory] = useState(r?.category ?? '');
  const [description, setDescription] = useState(r?.description ?? '');
  const [yieldAmount, setYieldAmount] = useState<number | ''>(r?.yield ?? '');
  const [price, setPrice] = useState<number | ''>(r?.sellingPrice ?? '');
  const [ingredients, setIngredients] = useState<any[]>(r?.ingredients?.length ? r.ingredients : [{ ingredientId: '', name: '', quantity: '', unit: 'g' }]);
  const [steps, setSteps] = useState<StepEntry[]>(() => {
    if (!r?.steps?.length) return [{ type: 'step' as const, instruction: '', duration: '' as const }];
    return r.steps.map((s: any) => {
      if (s.type === 'sub_recipe') {
        return { type: 'sub_recipe' as const, recipeId: s.recipeId ?? '', quantity: s.quantity ?? '' };
      }
      return {
        type: 'step' as const,
        instruction: typeof s === 'string' ? s : s.instruction ?? '',
        duration: s.duration ?? '',
      };
    });
  });

  useEffect(() => {
    if (!r) return;
    setName(r.name ?? '');
    setCategory(r.category ?? '');
    setDescription(r.description ?? '');
    setYieldAmount(r.yield ?? '');
    setPrice(r.sellingPrice ?? '');
    setIngredients(r.ingredients?.length ? r.ingredients : [{ ingredientId: '', name: '', quantity: '', unit: 'g' }]);
    setSteps(
      r.steps?.length
        ? r.steps.map((s: any) => {
            if (s.type === 'sub_recipe') {
              return { type: 'sub_recipe' as const, recipeId: s.recipeId ?? '', quantity: s.quantity ?? '' };
            }
            return {
              type: 'step' as const,
              instruction: typeof s === 'string' ? s : s.instruction ?? '',
              duration: s.duration ?? '',
            };
          })
        : [{ type: 'step' as const, instruction: '', duration: '' as const }]
    );
  }, [r]);

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { ingredientId: '', name: '', quantity: '', unit: 'g' }]);
  }, []);

  const removeIngredient = useCallback((i: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const addStep = useCallback(() => setSteps((prev) => [...prev, { type: 'step', instruction: '', duration: '' }]), []);
  const addSubRecipeStep = useCallback(() => setSteps((prev) => [...prev, { type: 'sub_recipe', recipeId: '', quantity: '' }]), []);
  const removeStep = useCallback((i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i)), []);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchDragIndex = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchDragging = useRef(false);
  const gripRefs = useRef<(HTMLDivElement | null)[]>([]);

  const reorderSteps = useCallback((from: number, to: number) => {
    if (from === to) return;
    setSteps((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  }, []);

  // Desktop drag — only the grip handle has draggable, so these fire from there
  const handleDragStart = useCallback((e: React.DragEvent, i: number) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropPosition(e.clientY < midY ? 'before' : 'after');
    setDragOverIndex(i);
  }, []);
  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null) {
      let to = dragOverIndex;
      if (dropPosition === 'after') to += 1;
      if (to > dragIndex) to -= 1;
      reorderSteps(dragIndex, to);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, dropPosition, reorderSteps]);

  // Touch drag — only triggered via long-press on the grip handle
  const handleGripTouchStart = useCallback((i: number) => {
    longPressTimer.current = setTimeout(() => {
      isTouchDragging.current = true;
      touchDragIndex.current = i;
      setDragIndex(i);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
    }, 200);
  }, []);
  const handleGripTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchDragging.current) {
      // Cancel long-press if finger moves before it triggers
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      return;
    }
    e.preventDefault(); // prevent scroll only when actively dragging
    const touch = e.touches[0];
    if (!touch) return;
    const target = stepRefs.current.findIndex((ref) => {
      if (!ref) return false;
      const rect = ref.getBoundingClientRect();
      return touch.clientY >= rect.top && touch.clientY <= rect.bottom;
    });
    if (target !== -1) {
      const ref = stepRefs.current[target];
      if (ref) {
        const rect = ref.getBoundingClientRect();
        setDropPosition(touch.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
      }
      setDragOverIndex(target);
    }
  }, []);
  const handleGripTouchEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (isTouchDragging.current) {
      const from = touchDragIndex.current;
      if (from !== null && dragOverIndex !== null) {
        let to = dragOverIndex;
        if (dropPosition === 'after') to += 1;
        if (to > from) to -= 1;
        reorderSteps(from, to);
      }
      isTouchDragging.current = false;
      touchDragIndex.current = null;
      setDragIndex(null);
      setDragOverIndex(null);
    }
  }, [dragOverIndex, dropPosition, reorderSteps]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const formattedSteps = steps
        .filter((s) => s.type === 'sub_recipe' ? (s as any).recipeId : (s as any).instruction?.trim())
        .map((s, i) => {
          if (s.type === 'sub_recipe') {
            return { type: 'sub_recipe' as const, order: i + 1, recipeId: (s as any).recipeId, quantity: (s as any).quantity || 1 };
          }
          return { type: 'step' as const, instruction: (s as any).instruction, order: i + 1, ...((s as any).duration ? { duration: (s as any).duration } : {}) };
        });
      const body = { name, category, description, yield: yieldAmount, sellingPrice: price, ingredients, steps: formattedSteps };
      if (isEdit) {
        updateRecipe.mutate({ id: id!, ...body }, { onSuccess: () => navigate(`/recipes/${id}`) });
      } else {
        createRecipe.mutate(body, { onSuccess: () => navigate('/recipes') });
      }
    },
    [name, category, description, yieldAmount, price, ingredients, steps, isEdit, id, createRecipe, updateRecipe, navigate]
  );

  const isPending = createRecipe.isPending || updateRecipe.isPending;

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: t('nav.recipes'), path: '/recipes' },
          { label: isEdit ? t('common.edit') : t('recipes.create', 'New Recipe') },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Stack gap={6}>
          <Card>
            <Stack gap={4}>
              <TextInput label={t('recipes.name', 'Name')} value={name} onChange={(e) => setName(e.target.value)} required dir="auto" />
              <Select label={t('recipes.category', 'Category')} options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('common.select', 'Select...')} />
              <TextArea label={t('recipes.description', 'Description')} value={description} onChange={(e) => setDescription(e.target.value)} dir="auto" />
              <Row gap={4}>
                <NumberInput label={t('recipes.yield', 'Yield')} value={yieldAmount} onChange={setYieldAmount} min={0} className="flex-1" />
                <NumberInput label={t('recipes.sellingPrice', 'Selling Price (₪)')} value={price} onChange={setPrice} min={0} className="flex-1" />
              </Row>
            </Stack>
          </Card>

          <Card>
            <h3 className="mb-3 font-heading text-h4 text-neutral-800">{t('recipes.ingredients', 'Ingredients')}</h3>
            <Stack gap={2}>
              {ingredients.map((ing, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-md border border-neutral-100 p-2 sm:flex-row sm:items-end sm:border-0 sm:p-0">
                  <Select
                    placeholder={t('recipes.ingredientName', 'Ingredient')}
                    options={inventoryItems.filter((item: any) => item.id === ing.ingredientId || !ingredients.some((other, idx) => idx !== i && other.ingredientId === item.id)).map((item: any) => ({ value: item.id, label: item.name }))}
                    value={ing.ingredientId ?? ''}
                    onChange={(e) => {
                      const selected = inventoryItems.find((item: any) => item.id === e.target.value);
                      setIngredients((prev) => prev.map((item, idx) => (idx === i ? { ...item, ingredientId: e.target.value, name: selected?.name ?? '', unit: selected?.unit ?? item.unit } : item)));
                    }}
                    className="min-w-0 sm:flex-1"
                  />
                  <div className="flex items-end gap-2">
                    <NumberInput
                      placeholder={t('common.qty', 'Qty')}
                      value={ing.quantity}
                      onChange={(v) => setIngredients((prev) => prev.map((item, idx) => (idx === i ? { ...item, quantity: v } : item)))}
                      className="flex-1 sm:w-16 sm:flex-none"
                    />
                    <Select
                      options={[{ value: 'g', label: t('common.units.g', 'g') }, { value: 'kg', label: t('common.units.kg', 'kg') }, { value: 'ml', label: t('common.units.ml', 'ml') }, { value: 'l', label: t('common.units.l', 'l') }, { value: 'pcs', label: t('common.units.pcs', 'pcs') }]}
                      value={ing.unit}
                      onChange={(e) => setIngredients((prev) => prev.map((item, idx) => (idx === i ? { ...item, unit: e.target.value } : item)))}
                      className="flex-1 sm:w-16 sm:flex-none"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeIngredient(i)}>
                      <Trash2 className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addIngredient} className="self-center">
                {t('recipes.addIngredient', 'Add')}
              </Button>
            </Stack>
          </Card>

          <Card>
            <h3 className="mb-3 font-heading text-h4 text-neutral-800">{t('recipes.steps', 'Steps')}</h3>
            <Stack gap={2}>
              {steps.map((step, i) => (
                <div key={i} className="relative">
                  {/* Drop indicator line — before */}
                  {dragOverIndex === i && dragIndex !== null && dragIndex !== i && dropPosition === 'before' && (
                    <div className="pointer-events-none absolute -top-1 left-0 right-0 z-10 flex items-center">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />
                      <div className="h-0.5 flex-1 bg-primary-500" />
                    </div>
                  )}
                  <div
                    ref={(el) => { stepRefs.current[i] = el; }}
                    onDragOver={(e: React.DragEvent) => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'flex gap-2 rounded-md border border-neutral-100 p-2 transition-colors sm:items-center sm:border-0 sm:p-0',
                      dragIndex === i && 'opacity-40 scale-[0.98]'
                    )}
                  >
                  <div
                    ref={(el) => { gripRefs.current[i] = el; }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onTouchStart={() => handleGripTouchStart(i)}
                    onTouchMove={handleGripTouchMove}
                    onTouchEnd={handleGripTouchEnd}
                    className="flex shrink-0 touch-none items-center gap-2"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-neutral-300 active:cursor-grabbing" />
                    <span className="text-body-sm font-semibold text-neutral-500">{i + 1}.</span>
                  </div>
                  {step.type === 'step' ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <TextArea
                        value={step.instruction}
                        onChange={(e) => setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, instruction: e.target.value } : s)))}
                        className="min-w-0 flex-1"
                        dir="auto"
                        rows={2}
                      />
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex w-14 flex-col items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-neutral-400" />
                          <NumberInput
                            placeholder={t('recipes.minutes', 'min')}
                            value={step.duration}
                            onChange={(v) => setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, duration: v } : s)))}
                            min={0}
                          />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(i)}>
                          <Trash2 className="h-4 w-4 text-neutral-400" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-1.5 text-primary-600">
                        <ChefHat className="h-4 w-4 shrink-0" />
                      </div>
                      <Select
                        placeholder={t('recipes.selectSubRecipe', 'Select recipe...')}
                        options={recipeOptions}
                        value={step.recipeId}
                        onChange={(e) => setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, recipeId: e.target.value } : s)))}
                        className="min-w-0 flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <NumberInput
                          placeholder={t('common.qty', 'Qty')}
                          value={step.quantity}
                          onChange={(v) => setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, quantity: v } : s)))}
                          min={0}
                          className="w-20"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(i)}>
                          <Trash2 className="h-4 w-4 text-neutral-400" />
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                  {/* Drop indicator line — after */}
                  {dragOverIndex === i && dragIndex !== null && dragIndex !== i && dropPosition === 'after' && (
                    <div className="pointer-events-none absolute -bottom-1 left-0 right-0 z-10 flex items-center">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />
                      <div className="h-0.5 flex-1 bg-primary-500" />
                    </div>
                  )}
                </div>
              ))}
              <Row gap={2} className="justify-center">
                <Button type="button" variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addStep}>
                  {t('recipes.addStep', 'Add Step')}
                </Button>
                <Button type="button" variant="ghost" size="sm" icon={<ChefHat className="h-4 w-4" />} onClick={addSubRecipeStep}>
                  {t('recipes.addSubRecipe', 'Add Sub-Recipe')}
                </Button>
              </Row>
            </Stack>
          </Card>

          <Row gap={2} className="justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              {t('common.save')}
            </Button>
          </Row>
        </Stack>
      </form>
    </Page>
  );
}
