import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, LayoutGrid, List, BookOpen } from 'lucide-react';
import { Page, PageHeader, Card } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, EmptyState, type Column } from '@/components/DataDisplay';
import { RotatingImage } from '@/components/RotatingImage';
import { PageSkeleton } from '@/components/Feedback';
import { Caption } from '@/components/Typography';
import { useRecipes } from '@/api/hooks';
import { GroupIcon } from '@/components/settings/GroupsTab';

type ViewMode = 'grid' | 'list';

export default function RecipesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: recipes, isLoading } = useRecipes();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');

  const recipeList = (recipes as any[]) ?? [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    recipeList.forEach((r: any) => { if (r.category) set.add(r.category); });
    return Array.from(set).sort();
  }, [recipeList]);

  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string | null; icon: string | null }>();
    recipeList.forEach((r: any) => {
      (r.groups ?? []).forEach((g: any) => { if (!map.has(g.id)) map.set(g.id, g); });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [recipeList]);

  const filteredRecipes = useMemo(() => {
    let result = recipeList;
    if (categoryFilter) result = result.filter((r: any) => r.category === categoryFilter);
    if (groupFilter) result = result.filter((r: any) => (r.groups ?? []).some((g: any) => g.id === groupFilter));
    return result;
  }, [recipeList, categoryFilter, groupFilter]);

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: 'photo',
        header: '',
        render: (row: any) =>
          row.photos && row.photos.length > 0 ? (
            <RotatingImage photos={row.photos} alt={row.name} className="h-12 w-12 rounded" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-primary-100">
              <BookOpen className="h-5 w-5 text-primary-300" />
            </div>
          ),
      },
      { key: 'name', header: t('recipes.name', 'Name'), sortable: true },
      { key: 'category', header: t('recipes.category', 'Category'), sortable: true },
      {
        key: 'cost',
        header: t('recipes.cost', 'Cost'),
        align: 'end' as const,
        render: (row: any) => <span className="font-mono">{row.totalCost ?? 0} {t('common.currency')}</span>,
      },
      {
        key: 'sellingPrice',
        header: t('recipes.price', 'Price'),
        align: 'end' as const,
        render: (row: any) => <span className="font-mono">{row.sellingPrice ?? 0} {t('common.currency')}</span>,
      },
    ],
    [t]
  );

  if (isLoading) return <PageSkeleton />;

  const filterToolbar = (categories.length > 0 || groups.length > 0) ? (
    <>
      {categories.length > 0 && (
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">{t('recipes.allCategories', 'All Categories')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
      {groups.length > 0 && (
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">{t('recipes.allGroups', 'All Groups')}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      )}
      {(categoryFilter || groupFilter) && (
        <button
          onClick={() => { setCategoryFilter(''); setGroupFilter(''); }}
          className="text-body-sm text-primary-600 hover:text-primary-700"
        >
          {t('common.clearFilters', 'Clear filters')}
        </button>
      )}
    </>
  ) : undefined;

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

      {viewMode === 'grid' && filterToolbar && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filterToolbar}
        </div>
      )}

      {filteredRecipes.length === 0 && recipeList.length === 0 ? (
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
      ) : filteredRecipes.length === 0 ? (
        <EmptyState
          title={t('recipes.noResults', 'No matching recipes')}
          description={t('recipes.noResultsDesc', 'Try changing or clearing your filters.')}
          icon={<BookOpen className="h-16 w-16" />}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRecipes.map((recipe: any) => (
            <Card
              key={recipe.id}
              variant="interactive"
              className="flex flex-col justify-between"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              <div>
                {recipe.photos && recipe.photos.length > 0 ? (
                  <RotatingImage photos={recipe.photos} alt={recipe.name} className="mb-3 h-32 w-full rounded-md" />
                ) : (
                  <div className="mb-3 flex h-32 items-center justify-center rounded-md bg-primary-100">
                    <BookOpen className="h-10 w-10 text-primary-300" />
                  </div>
                )}
                <h3 className="font-heading text-h4 text-neutral-800">{recipe.name}</h3>
                {recipe.category && <Caption>{recipe.category}</Caption>}
              </div>
              {recipe.groups?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {recipe.groups.map((g: any) => (
                    <span key={g.id} title={g.name} className="inline-flex items-center rounded-full bg-neutral-100 p-1">
                      <GroupIcon icon={g.icon ?? null} color={g.color ?? null} size={12} />
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-3 flex items-center justify-between text-body-sm">
                <span className="text-neutral-500">{t('recipes.cost', 'Cost')}: <span className="font-mono">{recipe.totalCost ?? 0}</span></span>
                <span className="font-medium text-primary-700">{recipe.sellingPrice ?? 0} {t('common.currency')}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRecipes}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => navigate(`/recipes/${row.id}`)}
          searchable
          toolbar={filterToolbar}
        />
      )}
    </Page>
  );
}
