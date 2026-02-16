import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, ChefHat } from 'lucide-react';
import { Page, Card, Section, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import { PageLoading } from '@/components/Feedback';
import { ConfirmModal } from '@/components/Modal';
import { useRecipe, useDeleteRecipe } from '@/api/hooks';

type TabKey = 'ingredients' | 'steps' | 'cost';

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

  const subRecipeSteps = (r.steps ?? []).filter((s: any) => s.type === 'sub_recipe');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'ingredients', label: t('recipes.ingredients', 'Ingredients') },
    { key: 'steps', label: t('recipes.steps', 'Steps') },
    { key: 'cost', label: t('recipes.costTab', 'Cost') },
  ];

  const ingredientCost = (r.ingredients ?? []).reduce((sum: number, ing: any) => sum + (ing.totalCost ?? 0), 0);
  const subRecipeCost = subRecipeSteps.reduce((sum: number, s: any) => sum + (s.totalCost ?? 0), 0);
  const totalCost = ingredientCost + subRecipeCost;

  return (
    <Page>
      <Breadcrumbs items={[{ label: t('nav.recipes'), path: '/recipes' }, { label: r.name }]} />

      {r.photos && r.photos.length > 0 && (
        <img src={r.photos[0]} alt={r.name} className="mb-6 h-64 w-full rounded-lg object-cover" />
      )}

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

      {(r.description || r.yield || r.sellingPrice) && (
        <Card className="mb-6">
          {r.description && <p className="text-body text-neutral-600">{r.description}</p>}
          {(r.yield || r.sellingPrice) && (
            <div className="mt-2 flex gap-4 text-body-sm text-neutral-500">
              {r.yield && <span>{t('recipes.yield', 'Yield')}: {r.yield}</span>}
              {r.sellingPrice != null && <span>{t('recipes.sellingPrice', 'Selling Price')}: {r.sellingPrice} {t('common.currency')}</span>}
            </div>
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
            <IngredientsTable label={r.name} ingredients={r.ingredients ?? []} t={t} />
            {subRecipeSteps.map((sr: any, i: number) => (
              sr.ingredients && sr.ingredients.length > 0 && (
                <div key={i} className="mt-6">
                  <IngredientsTable label={`${sr.name} (x${sr.quantity})`} ingredients={sr.ingredients} t={t} />
                </div>
              )
            ))}
          </div>
        )}

        {activeTab === 'steps' && (
          <Stack gap={3}>
            {(r.steps ?? []).map((step: any, i: number) => (
              step.type === 'sub_recipe' ? (
                <div key={i} className="rounded-md border border-primary-100 bg-primary-50 overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-200 text-body-sm font-semibold text-primary-700">
                      {step.order ?? i + 1}
                    </span>
                    <ChefHat className="h-4 w-4 shrink-0 text-primary-600" />
                    <span className="text-body-sm font-medium text-primary-700">{step.name ?? 'Sub-Recipe'}</span>
                    <span className="font-mono text-body-sm text-neutral-600">x{step.quantity ?? 1}</span>
                  </div>
                  {step.subSteps && step.subSteps.length > 0 && (
                    <div className="border-t border-primary-100 bg-white/60 px-4 py-3">
                      <Stack gap={2}>
                        {step.subSteps.filter((ss: any) => ss.type !== 'sub_recipe').map((ss: any, j: number) => (
                          <div key={j} className="flex gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-caption font-semibold text-primary-500">
                              {ss.order ?? j + 1}
                            </span>
                            <div>
                              <p className="text-caption text-neutral-500">{ss.instruction}</p>
                              {ss.duration && (
                                <p className="text-caption text-neutral-400">{ss.duration} {t('recipes.minutes', 'min')}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </Stack>
                    </div>
                  )}
                </div>
              ) : (
                <StepRow key={i} step={step} index={i} t={t} />
              )
            ))}
            {(r.steps ?? []).length === 0 && (
              <p className="text-body-sm text-neutral-400">{t('recipes.noSteps', 'No steps added.')}</p>
            )}
          </Stack>
        )}

        {activeTab === 'cost' && (
          <Stack gap={3}>
            <CostRow label={t('recipes.ingredientCost', 'Ingredient Cost')} value={`${ingredientCost.toFixed(2)} ${t('common.currency')}`} />
            {subRecipeSteps.length > 0 && <CostRow label={t('recipes.subRecipeCost', 'Sub-Recipe Cost')} value={`${subRecipeCost.toFixed(2)} ${t('common.currency')}`} />}
            <hr className="border-neutral-200" />
            <CostRow label={t('recipes.totalCost', 'Total Cost')} value={`${totalCost.toFixed(2)} ${t('common.currency')}`} bold />
            <CostRow label={t('recipes.sellingPrice', 'Selling Price')} value={`${r.sellingPrice ?? 0} ${t('common.currency')}`} />
            <CostRow
              label={t('recipes.margin', 'Margin')}
              value={`${((r.sellingPrice ?? 0) - totalCost).toFixed(2)} ${t('common.currency')} (${r.sellingPrice ? (((r.sellingPrice - totalCost) / r.sellingPrice) * 100).toFixed(1) : 0}%)`}
              bold
              highlight
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

const CostRow = React.memo(function CostRow({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between text-body-sm ${bold ? 'font-semibold text-neutral-800' : 'text-neutral-600'}`}>
      <span>{label}</span>
      {highlight ? (
        <span className="relative inline-block px-2 py-0.5 font-mono">
          <span
            className="absolute -inset-x-2 inset-y-0 -rotate-2"
            aria-hidden="true"
            style={{
              borderRadius: '0.8em 0.3em',
              backgroundImage: 'linear-gradient(to right, rgba(250, 204, 21, 0.15), rgba(250, 204, 21, 0.6) 4%, rgba(250, 204, 21, 0.35))',
            }}
          />
          <span className="relative">{value}</span>
        </span>
      ) : (
        <span className="font-mono">{value}</span>
      )}
    </div>
  );
});

function IngredientsTable({ label, ingredients, t }: { label: string; ingredients: any[]; t: (key: string, fallback?: string) => string }) {
  const total = ingredients.reduce((sum: number, ing: any) => sum + (ing.totalCost ?? 0), 0);
  return (
    <>
      <h3 className="mb-2 font-heading text-h4 text-neutral-800">{label}</h3>
      <table className="mb-2 w-full text-body-sm">
        <thead>
          <tr className="border-b bg-neutral-50">
            <th className="px-2 py-2 text-start font-semibold sm:px-3">{t('recipes.ingredient', 'Ingredient')}</th>
            <th className="px-2 py-2 text-end font-semibold sm:px-3">{t('recipes.qty', 'Qty')}</th>
            <th className="px-2 py-2 text-end font-semibold sm:px-3">{t('recipes.unit', 'Unit')}</th>
            <th className="hidden px-2 py-2 text-end font-semibold sm:table-cell sm:px-3">{t('recipes.costPerUnit', 'Cost/Unit')}</th>
            <th className="px-2 py-2 text-end font-semibold sm:px-3">{t('orders.total', 'Total')}</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing: any, i: number) => (
            <tr key={i} className="border-b border-neutral-100">
              <td className="px-2 py-2 sm:px-3">{ing.name}</td>
              <td className="px-2 py-2 text-end font-mono sm:px-3">{ing.quantity}</td>
              <td className="px-2 py-2 text-end sm:px-3">{t(`common.units.${ing.unit}`, ing.unit)}</td>
              <td className="hidden px-2 py-2 text-end font-mono sm:table-cell sm:px-3">{ing.costPerUnit}</td>
              <td className="px-2 py-2 text-end font-mono sm:px-3">{ing.totalCost}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={3} className="px-2 py-2 text-end sm:hidden">{t('orders.total', 'Total')}</td>
            <td colSpan={4} className="hidden px-2 py-2 text-end sm:table-cell sm:px-3">{t('orders.total', 'Total')}</td>
            <td className="px-2 py-2 text-end font-mono sm:px-3">
              <span className="relative inline-block px-2 py-0.5 font-bold text-neutral-800">
                <span
                  className="absolute -inset-x-2 inset-y-0 -rotate-2"
                  aria-hidden="true"
                  style={{
                    borderRadius: '0.8em 0.3em',
                    backgroundImage: 'linear-gradient(to right, rgba(250, 204, 21, 0.15), rgba(250, 204, 21, 0.6) 4%, rgba(250, 204, 21, 0.35))',
                  }}
                />
                <span className="relative">{total.toFixed(2)} {t('common.currency')}</span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

function StepRow({ step, index, t }: { step: any; index: number; t: (key: string, fallback?: string) => string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-body-sm font-semibold text-primary-700">
        {step.order ?? index + 1}
      </span>
      <div className="pt-1">
        <p className="text-body-sm text-neutral-600">{step.instruction}</p>
        {step.duration && (
          <p className="mt-1 text-caption text-neutral-400">{step.duration} {t('recipes.minutes', 'min')}</p>
        )}
      </div>
    </div>
  );
}
