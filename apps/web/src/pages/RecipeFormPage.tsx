import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Page, Card, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TextInput, TextArea, NumberInput, Select } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { useCreateRecipe, useUpdateRecipe, useRecipe } from '@/api/hooks';

const categoryOptions = [
  { value: 'cakes', label: 'Cakes' },
  { value: 'breads', label: 'Breads' },
  { value: 'pastries', label: 'Pastries' },
  { value: 'cookies', label: 'Cookies' },
  { value: 'other', label: 'Other' },
];

export default function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: existingRecipe } = useRecipe(id ?? '');
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();

  const r = existingRecipe as any;

  const [name, setName] = useState(r?.name ?? '');
  const [category, setCategory] = useState(r?.category ?? '');
  const [description, setDescription] = useState(r?.description ?? '');
  const [yieldAmount, setYieldAmount] = useState<number | ''>(r?.yield ?? '');
  const [price, setPrice] = useState<number | ''>(r?.price ?? '');
  const [ingredients, setIngredients] = useState<any[]>(r?.ingredients ?? []);
  const [steps, setSteps] = useState<string[]>(r?.steps ?? ['']);

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: 'g' }]);
  }, []);

  const removeIngredient = useCallback((i: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const addStep = useCallback(() => setSteps((prev) => [...prev, '']), []);
  const removeStep = useCallback((i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i)), []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const body = { name, category, description, yield: yieldAmount, price, ingredients, steps };
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
              <Select label={t('recipes.category', 'Category')} options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select..." />
              <TextArea label={t('recipes.description', 'Description')} value={description} onChange={(e) => setDescription(e.target.value)} dir="auto" />
              <Row gap={4}>
                <NumberInput label={t('recipes.yield', 'Yield')} value={yieldAmount} onChange={setYieldAmount} min={0} className="flex-1" />
                <NumberInput label={t('recipes.sellingPrice', 'Selling Price (NIS)')} value={price} onChange={setPrice} min={0} className="flex-1" />
              </Row>
            </Stack>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-h4 text-neutral-800">{t('recipes.ingredients', 'Ingredients')}</h3>
              <Button type="button" variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addIngredient}>
                {t('recipes.addIngredient', 'Add')}
              </Button>
            </div>
            <Stack gap={2}>
              {ingredients.map((ing, i) => (
                <Row key={i} gap={2} className="items-end">
                  <TextInput
                    placeholder={t('recipes.ingredientName', 'Ingredient')}
                    value={ing.name}
                    onChange={(e) => setIngredients((prev) => prev.map((item, idx) => (idx === i ? { ...item, name: e.target.value } : item)))}
                    className="flex-1"
                    dir="auto"
                  />
                  <NumberInput
                    placeholder="Qty"
                    value={ing.quantity}
                    onChange={(v) => setIngredients((prev) => prev.map((item, idx) => (idx === i ? { ...item, quantity: v } : item)))}
                    className="w-20"
                  />
                  <Select
                    options={[{ value: 'g', label: 'g' }, { value: 'kg', label: 'kg' }, { value: 'ml', label: 'ml' }, { value: 'l', label: 'l' }, { value: 'pcs', label: 'pcs' }]}
                    value={ing.unit}
                    onChange={(e) => setIngredients((prev) => prev.map((item, idx) => (idx === i ? { ...item, unit: e.target.value } : item)))}
                    className="w-24"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeIngredient(i)}>
                    <Trash2 className="h-4 w-4 text-neutral-400" />
                  </Button>
                </Row>
              ))}
            </Stack>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-h4 text-neutral-800">{t('recipes.steps', 'Steps')}</h3>
              <Button type="button" variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addStep}>
                {t('recipes.addStep', 'Add Step')}
              </Button>
            </div>
            <Stack gap={2}>
              {steps.map((step, i) => (
                <Row key={i} gap={2} className="items-start">
                  <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-neutral-300" />
                  <span className="mt-2 text-body-sm font-semibold text-neutral-500">{i + 1}.</span>
                  <TextArea
                    value={step}
                    onChange={(e) => setSteps((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))}
                    className="flex-1"
                    dir="auto"
                    rows={2}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(i)} className="mt-1">
                    <Trash2 className="h-4 w-4 text-neutral-400" />
                  </Button>
                </Row>
              ))}
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
