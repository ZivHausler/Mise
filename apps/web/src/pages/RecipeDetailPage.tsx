import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2 } from 'lucide-react';
import { Page, Card, Section, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import { PageLoading } from '@/components/Feedback';
import { ConfirmModal } from '@/components/Modal';
import { useRecipe, useDeleteRecipe } from '@/api/hooks';

type TabKey = 'ingredients' | 'steps' | 'subRecipes' | 'cost';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: recipe, isLoading } = useRecipe(id!);
  const deleteRecipe = useDeleteRecipe();
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('ingredients');

  const r = recipe as any;

  if (isLoading) return <PageLoading />;
  if (!r) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'ingredients', label: t('recipes.ingredients', 'Ingredients') },
    { key: 'steps', label: t('recipes.steps', 'Steps') },
    { key: 'subRecipes', label: t('recipes.subRecipes', 'Sub-Recipes') },
    { key: 'cost', label: t('recipes.costTab', 'Cost') },
  ];

  const ingredientCost = (r.ingredients ?? []).reduce((sum: number, ing: any) => sum + (ing.totalCost ?? 0), 0);
  const subRecipeCost = (r.subRecipes ?? []).reduce((sum: number, sr: any) => sum + (sr.cost ?? 0), 0);
  const totalCost = ingredientCost + subRecipeCost;

  return (
    <Page>
      <Breadcrumbs items={[{ label: t('nav.recipes'), path: '/recipes' }, { label: r.name }]} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-h1 text-neutral-800">{r.name}</h1>
          {r.category && <p className="mt-1 text-body-sm text-neutral-500">{r.category}</p>}
        </div>
        <Row gap={2}>
          <Button variant="secondary" icon={<Edit className="h-4 w-4" />} onClick={() => navigate(`/recipes/${r.id}/edit`)}>
            {t('common.edit')}
          </Button>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowDelete(true)}>
            {t('common.delete')}
          </Button>
        </Row>
      </div>

      {r.description && (
        <Card className="mb-6">
          <p className="text-body text-neutral-600">{r.description}</p>
          {r.yield && (
            <p className="mt-2 text-body-sm text-neutral-500">
              {t('recipes.yield', 'Yield')}: {r.yield}
            </p>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-4 flex gap-1 border-b border-neutral-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-body-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-primary-500 text-primary-700'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'ingredients' && (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b bg-neutral-50">
                  <th className="px-3 py-2 text-start font-semibold">{t('recipes.ingredient', 'Ingredient')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('recipes.qty', 'Qty')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('recipes.unit', 'Unit')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('recipes.costPerUnit', 'Cost/Unit')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('orders.total', 'Total')}</th>
                </tr>
              </thead>
              <tbody>
                {(r.ingredients ?? []).map((ing: any, i: number) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="px-3 py-2">{ing.name}</td>
                    <td className="px-3 py-2 text-end font-mono">{ing.quantity}</td>
                    <td className="px-3 py-2 text-end">{ing.unit}</td>
                    <td className="px-3 py-2 text-end font-mono">{ing.costPerUnit}</td>
                    <td className="px-3 py-2 text-end font-mono">{ing.totalCost}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-end">{t('orders.total', 'Total')}</td>
                  <td className="px-3 py-2 text-end font-mono">{ingredientCost.toFixed(2)} NIS</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {activeTab === 'steps' && (
          <Stack gap={3}>
            {(r.steps ?? []).map((step: string, i: number) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-body-sm font-semibold text-primary-700">
                  {i + 1}
                </span>
                <p className="text-body-sm text-neutral-600 pt-1">{step}</p>
              </div>
            ))}
            {(r.steps ?? []).length === 0 && (
              <p className="text-body-sm text-neutral-400">{t('recipes.noSteps', 'No steps added.')}</p>
            )}
          </Stack>
        )}

        {activeTab === 'subRecipes' && (
          <Stack gap={2}>
            {(r.subRecipes ?? []).map((sr: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-neutral-100 p-3">
                <span className="text-body-sm font-medium text-neutral-800">{sr.name}</span>
                <span className="font-mono text-body-sm text-neutral-600">{sr.cost} NIS</span>
              </div>
            ))}
            {(r.subRecipes ?? []).length === 0 && (
              <p className="text-body-sm text-neutral-400">{t('recipes.noSubRecipes', 'No sub-recipes.')}</p>
            )}
          </Stack>
        )}

        {activeTab === 'cost' && (
          <Stack gap={3}>
            <CostRow label={t('recipes.ingredientCost', 'Ingredient Cost')} value={`${ingredientCost.toFixed(2)} NIS`} />
            <CostRow label={t('recipes.subRecipeCost', 'Sub-Recipe Cost')} value={`${subRecipeCost.toFixed(2)} NIS`} />
            <hr className="border-neutral-200" />
            <CostRow label={t('recipes.totalCost', 'Total Cost')} value={`${totalCost.toFixed(2)} NIS`} bold />
            <CostRow label={t('recipes.sellingPrice', 'Selling Price')} value={`${r.price ?? 0} NIS`} />
            <CostRow
              label={t('recipes.margin', 'Margin')}
              value={`${((r.price ?? 0) - totalCost).toFixed(2)} NIS (${r.price ? (((r.price - totalCost) / r.price) * 100).toFixed(1) : 0}%)`}
              bold
            />
          </Stack>
        )}
      </Card>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteRecipe.mutate(r.id, { onSuccess: () => navigate('/recipes') })}
        title={t('recipes.deleteTitle', 'Delete Recipe?')}
        message={t('recipes.deleteMsg', 'This action cannot be undone.')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        loading={deleteRecipe.isPending}
      />
    </Page>
  );
}

const CostRow = React.memo(function CostRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-body-sm ${bold ? 'font-semibold text-neutral-800' : 'text-neutral-600'}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
});
