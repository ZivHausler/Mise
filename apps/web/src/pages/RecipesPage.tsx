import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, LayoutGrid, List, BookOpen } from 'lucide-react';
import { Page, PageHeader, Card } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, EmptyState, type Column } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { Caption } from '@/components/Typography';
import { useRecipes } from '@/api/hooks';

type ViewMode = 'grid' | 'list';

export default function RecipesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: recipes, isLoading } = useRecipes();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'name', header: t('recipes.name', 'Name'), sortable: true },
      { key: 'category', header: t('recipes.category', 'Category'), sortable: true },
      {
        key: 'cost',
        header: t('recipes.cost', 'Cost'),
        align: 'end' as const,
        render: (row: any) => <span className="font-mono">{row.cost ?? 0} NIS</span>,
      },
      {
        key: 'price',
        header: t('recipes.price', 'Price'),
        align: 'end' as const,
        render: (row: any) => <span className="font-mono">{row.price ?? 0} NIS</span>,
      },
    ],
    [t]
  );

  if (isLoading) return <PageLoading />;

  const recipeList = (recipes as any[]) ?? [];

  return (
    <Page>
      <PageHeader
        title={t('nav.recipes')}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-neutral-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-s-md p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'text-neutral-400'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-e-md p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-neutral-400'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/recipes/new')}>
              {t('recipes.create', 'New Recipe')}
            </Button>
          </div>
        }
      />

      {recipeList.length === 0 ? (
        <EmptyState
          title={t('recipes.empty', 'No recipes yet')}
          description={t('recipes.emptyDesc', 'Add your first recipe to get started.')}
          icon={<BookOpen className="h-16 w-16" />}
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/recipes/new')}>
              {t('recipes.create', 'New Recipe')}
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipeList.map((recipe: any) => (
            <Card
              key={recipe.id}
              variant="interactive"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              <div className="mb-3 flex h-32 items-center justify-center rounded-md bg-primary-100">
                <BookOpen className="h-10 w-10 text-primary-300" />
              </div>
              <h3 className="font-heading text-h4 text-neutral-800">{recipe.name}</h3>
              {recipe.category && <Caption>{recipe.category}</Caption>}
              <div className="mt-2 flex items-center justify-between text-body-sm">
                <span className="text-neutral-500">{t('recipes.cost', 'Cost')}: <span className="font-mono">{recipe.cost ?? 0}</span></span>
                <span className="font-medium text-primary-700">{recipe.price ?? 0} NIS</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={recipeList}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => navigate(`/recipes/${row.id}`)}
          searchable
        />
      )}
    </Page>
  );
}
