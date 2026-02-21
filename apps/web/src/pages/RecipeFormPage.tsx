import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, Clock, ChefHat } from 'lucide-react';
import { Page, Card, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TextInput, TextArea, NumberInput, Select } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { useCreateRecipe, useUpdateRecipe, useRecipe, useRecipes, useInventory } from '@/api/hooks';
import { RecipeImageUpload } from '@/components/RecipeImageUpload';
import { cn } from '@/utils/cn';
import { useToastStore } from '@/store/toast';

const unitGroups: Record<string, string[]> = {
  kg: ['g', 'kg'],
  g: ['g', 'kg'],
  l: ['ml', 'l'],
  liters: ['ml', 'l'],
  ml: ['ml', 'l'],
  pcs: ['pcs'],
  units: ['pcs'],
};

const allUnits = ['g', 'kg', 'ml', 'l', 'pcs'];

const unitToBase: Record<string, { base: string; factor: number }> = {
  g:  { base: 'mass', factor: 1 },
  kg: { base: 'mass', factor: 1000 },
  ml: { base: 'volume', factor: 1 },
  l:  { base: 'volume', factor: 1000 },
  pcs: { base: 'count', factor: 1 },
};

function convertUnit(from: string, to: string): number {
  const f = unitToBase[from];
  const t = unitToBase[to];
  if (!f || !t || f.base !== t.base) return 1;
  return f.factor / t.factor;
}

function getCompatibleUnits(ing: any, inventoryItems: any[], t: (key: string, fallback?: string) => string) {
  const inventoryItem = ing.ingredientId ? inventoryItems.find((item: any) => item.id === ing.ingredientId) : null;
  const allowed = inventoryItem ? (unitGroups[inventoryItem.unit] ?? allUnits) : allUnits;
  const options = allowed.map((u) => ({ value: u, label: t(`common.units.${u}`, u) }));
  if (!ing.unit) options.unshift({ value: '', label: '—' });
  return options;
}

const categoryOptions = [
  { value: 'cakes', label: 'Cakes' },
  { value: 'breads', label: 'Breads' },
  { value: 'pastries', label: 'Pastries' },
  { value: 'cookies', label: 'Cookies' },
  { value: 'other', label: 'Other' },
];

let stepIdCounter = 0;
const nextStepId = () => `step-${++stepIdCounter}`;

type StepEntry =
  | { _id: string; type: 'step'; instruction: string; duration: number | '' }
  | { _id: string; type: 'sub_recipe'; recipeId: string; quantity: number | '' };

export default function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: existingRecipe } = useRecipe(id ?? '');
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const addToast = useToastStore((s) => s.addToast);

  const { data: inventory } = useInventory(1, 1000);
  const inventoryItems = ((inventory as any)?.items as any[] ?? []);

  const { data: allRecipes } = useRecipes();
  const recipeOptions = ((allRecipes as any[]) ?? [])
    .filter((rec: any) => rec.id !== id)
    .map((rec: any) => ({ value: rec.id, label: rec.name }));

  const r = existingRecipe as any;

  const [photos, setPhotos] = useState<string[]>(r?.photos ?? []);
  const [name, setName] = useState(r?.name ?? '');
  const [category, setCategory] = useState(r?.category ?? '');
  const [description, setDescription] = useState(r?.description ?? '');
  const [yieldAmount, setYieldAmount] = useState<number | ''>(r?.yield ?? '');
  const [price, setPrice] = useState<number | ''>(r?.sellingPrice ?? '');
  const [ingredients, setIngredients] = useState<any[]>(r?.ingredients?.length ? r.ingredients : [{ ingredientId: '', name: '', quantity: '', unit: '' }]);
  const [steps, setSteps] = useState<StepEntry[]>(() => {
    if (!r?.steps?.length) return [{ _id: nextStepId(), type: 'step' as const, instruction: '', duration: '' as const }];
    return r.steps.map((s: any) => {
      if (s.type === 'sub_recipe') {
        return { _id: nextStepId(), type: 'sub_recipe' as const, recipeId: s.recipeId ?? '', quantity: s.quantity ?? '' };
      }
      return {
        _id: nextStepId(),
        type: 'step' as const,
        instruction: typeof s === 'string' ? s : s.instruction ?? '',
        duration: s.duration ?? '',
      };
    });
  });

  useEffect(() => {
    if (!r) return;
    setPhotos(r.photos ?? []);
    setName(r.name ?? '');
    setCategory(r.category ?? '');
    setDescription(r.description ?? '');
    setYieldAmount(r.yield ?? '');
    setPrice(r.sellingPrice ?? '');
    setIngredients(r.ingredients?.length ? r.ingredients : [{ ingredientId: '', name: '', quantity: '', unit: '' }]);
    setSteps(
      r.steps?.length
        ? r.steps.map((s: any) => {
            if (s.type === 'sub_recipe') {
              return { _id: nextStepId(), type: 'sub_recipe' as const, recipeId: s.recipeId ?? '', quantity: s.quantity ?? '' };
            }
            return {
              _id: nextStepId(),
              type: 'step' as const,
              instruction: typeof s === 'string' ? s : s.instruction ?? '',
              duration: s.duration ?? '',
            };
          })
        : [{ _id: nextStepId(), type: 'step' as const, instruction: '', duration: '' as const }]
    );
  }, [r]);

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { ingredientId: '', name: '', quantity: '', unit: '' }]);
  }, []);

  const removeIngredient = useCallback((i: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const addStep = useCallback(() => setSteps((prev) => [...prev, { _id: nextStepId(), type: 'step', instruction: '', duration: '' }]), []);
  const addSubRecipeStep = useCallback(() => setSteps((prev) => [...prev, { _id: nextStepId(), type: 'sub_recipe', recipeId: '', quantity: '' }]), []);
  const removeStep = useCallback((i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i)), []);

  const handleStepDragEnd = useCallback((result: DropResult) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;
    setSteps((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved!);
      return updated;
    });
  }, []);

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
      if (formattedSteps.length === 0) {
        addToast('error', t('recipes.stepsRequired', 'At least one step is required'));
        return;
      }
      const body = { name, category, description: description || undefined, yield: yieldAmount === '' ? undefined : yieldAmount, sellingPrice: price === '' ? undefined : Number(price), ingredients, steps: formattedSteps, photos: photos.length ? photos : undefined };
      if (isEdit) {
        updateRecipe.mutate({ id: id!, ...body }, { onSuccess: () => navigate(`/recipes/${id}`) });
      } else {
        createRecipe.mutate(body, { onSuccess: () => navigate('/recipes') });
      }
    },
    [name, category, description, yieldAmount, price, ingredients, steps, photos, isEdit, id, createRecipe, updateRecipe, navigate]
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
            <h3 className="mb-3 font-heading text-h4 text-neutral-800">{t('recipes.photos', 'Photos')}</h3>
            <RecipeImageUpload photos={photos} onChange={setPhotos} />
          </Card>

          <Card>
            <h3 className="mb-3 font-heading text-h4 text-neutral-800">{t('recipes.ingredients', 'Ingredients')}</h3>
            <Stack gap={2}>
              {ingredients.map((ing, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-md border border-neutral-100 p-2 sm:flex-row sm:items-center sm:border-0 sm:p-0">
                  <Select
                    placeholder={t('recipes.ingredientName', 'Ingredient')}
                    options={inventoryItems.filter((item: any) => item.id === ing.ingredientId || !ingredients.some((other, idx) => idx !== i && other.ingredientId === item.id)).map((item: any) => ({ value: item.id, label: item.name }))}
                    value={ing.ingredientId ?? ''}
                    onChange={(e) => {
                      const selected = inventoryItems.find((item: any) => item.id === e.target.value);
                      const baseUnit = selected?.unit ?? 'g';
                      const compatible = unitGroups[baseUnit] ?? allUnits;
                      setIngredients((prev) => prev.map((item, idx) => (idx === i ? { ...item, ingredientId: e.target.value, name: selected?.name ?? '', unit: compatible.includes(item.unit) ? item.unit : compatible[0] } : item)));
                    }}
                    className="min-w-0 sm:flex-[2]"
                  />
                  <div className="flex items-center gap-2 sm:flex-[1.5]">
                    <NumberInput
                      placeholder={t('common.qty', 'Qty')}
                      value={ing.quantity}
                      onChange={(v) => setIngredients((prev) => prev.map((item, idx) => (idx === i ? { ...item, quantity: v } : item)))}
                      className="flex-1 sm:flex-1"
                    />
                    <Select
                      options={getCompatibleUnits(ing, inventoryItems, t)}
                      value={ing.unit}
                      onChange={(e) => {
                        const newUnit = e.target.value;
                        setIngredients((prev) => prev.map((item, idx) => {
                          if (idx !== i) return item;
                          const oldUnit = item.unit;
                          const qty = item.quantity;
                          if (!oldUnit || !newUnit || qty === '' || qty === 0) return { ...item, unit: newUnit };
                          const factor = convertUnit(oldUnit, newUnit);
                          const converted = +(qty * factor).toPrecision(6);
                          return { ...item, unit: newUnit, quantity: converted };
                        }));
                      }}
                      className="flex-1 sm:flex-1"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeIngredient(i)}>
                      <Trash2 className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addIngredient} className="self-center">
                {t('recipes.addIngredient', 'Add')}
              </Button>
            </Stack>
          </Card>

          <Card>
            <h3 className="mb-3 font-heading text-h4 text-neutral-800">{t('recipes.steps', 'Steps')}</h3>
            <DragDropContext onDragEnd={handleStepDragEnd}>
              <Droppable droppableId="recipe-steps">
                {(droppableProvided) => (
                  <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps} className="flex flex-col gap-2">
                    {steps.map((step, i) => (
                      <Draggable key={step._id} draggableId={step._id} index={i}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              'flex gap-2 rounded-md border border-neutral-100 bg-white p-2 transition-shadow sm:items-center dark:bg-neutral-800 dark:border-neutral-700',
                              snapshot.isDragging && 'shadow-lg ring-2 ring-primary-400',
                            )}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="flex shrink-0 items-center gap-2"
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
                        )}
                      </Draggable>
                    ))}
                    {droppableProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <Row gap={2} className="justify-center mt-2">
              <Button type="button" variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addStep}>
                {t('recipes.addStep', 'Add Step')}
              </Button>
              <Button type="button" variant="ghost" size="sm" icon={<ChefHat className="h-4 w-4" />} onClick={addSubRecipeStep}>
                {t('recipes.addSubRecipe', 'Add Sub-Recipe')}
              </Button>
            </Row>
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
