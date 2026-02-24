import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, LayoutGrid, List, BookOpen, ChevronDown, Filter } from 'lucide-react';
import { Page, PageHeader, Card } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, EmptyState, type Column } from '@/components/DataDisplay';
import { RotatingImage } from '@/components/RotatingImage';
import { PageSkeleton } from '@/components/Feedback';
import { useRecipes } from '@/api/hooks';
import { AllergenIcon, useAllergenName } from '@/components/settings/AllergensTab';
import { useAppStore } from '@/store/app';

function FilterDropdown({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-body-sm font-medium transition-colors ${count > 0 ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
      >
        <Filter className="h-3.5 w-3.5" />
        {label}
        {count > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[11px] font-semibold text-white">
            {count}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute start-0 top-full z-20 mt-1 min-w-[100px] rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export default function RecipesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: recipes, isLoading } = useRecipes();
  const viewMode = useAppStore((s) => s.recipesViewMode);
  const setViewMode = useAppStore((s) => s.setRecipesViewMode);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [allergenFilters, setAllergenFilters] = useState<string[]>([]);

  const getAllergenName = useAllergenName();
  const recipeList = (recipes as any[]) ?? [];

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    recipeList.forEach((r: any) => { (r.tags ?? []).forEach((t: string) => set.add(t)); });
    return Array.from(set).sort();
  }, [recipeList]);

  const allergenList = useMemo(() => {
    const map = new Map<string, { id: number; name: string; color: string | null; icon: string | null }>();
    recipeList.forEach((r: any) => {
      (r.allergens ?? []).forEach((g: any) => { if (!map.has(String(g.id))) map.set(String(g.id), g); });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [recipeList]);

  const filteredRecipes = useMemo(() => {
    let result = recipeList;
    if (tagFilters.length > 0) result = result.filter((r: any) => tagFilters.every((t) => (r.tags ?? []).includes(t)));
    if (allergenFilters.length > 0) result = result.filter((r: any) => allergenFilters.every((id) => (r.allergens ?? []).some((g: any) => String(g.id) === id)));
    return result;
  }, [recipeList, tagFilters, allergenFilters]);

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
      {
        key: 'tags',
        header: t('recipes.tags', 'Tags'),
        render: (row: any) =>
          row.tags?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.tags.map((tag: string) => (
                <span key={tag} className="inline-block rounded-full bg-primary-50 px-2 py-0.5 text-caption font-medium text-primary-700">{tag}</span>
              ))}
            </div>
          ) : null,
      },
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

  const filterToolbar = (uniqueTags.length > 0 || allergenList.length > 0) ? (
    <>
      {uniqueTags.length > 0 && (
        <FilterDropdown label={t('recipes.tags', 'Tags')} count={tagFilters.length}>
          {uniqueTags.map((tag) => {
            const selected = tagFilters.includes(tag);
            return (
              <button key={tag} type="button" onClick={() => setTagFilters((prev) => selected ? prev.filter((t) => t !== tag) : [...prev, tag])}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${selected ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-primary-500 bg-primary-500 text-white' : 'border-neutral-300'}`}>
                  {selected && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </span>
                <span>{tag}</span>
              </button>
            );
          })}
        </FilterDropdown>
      )}
      {allergenList.length > 0 && (
        <FilterDropdown label={t('recipes.allergens', 'Allergens')} count={allergenFilters.length}>
          {allergenList.map((g) => {
            const selected = allergenFilters.includes(String(g.id));
            return (
              <button key={String(g.id)} type="button" onClick={() => setAllergenFilters((prev) => selected ? prev.filter((id) => id !== String(g.id)) : [...prev, String(g.id)])}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm transition-colors ${selected ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-primary-500 bg-primary-500 text-white' : 'border-neutral-300'}`}>
                  {selected && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </span>
                <AllergenIcon icon={g.icon ?? null} color={g.color ?? null} size={g.icon ? 16 : 10} />
                <span>{getAllergenName(g)}</span>
              </button>
            );
          })}
        </FilterDropdown>
      )}
      {(tagFilters.length > 0 || allergenFilters.length > 0) && (
        <button
          onClick={() => { setTagFilters([]); setAllergenFilters([]); }}
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
                {recipe.tags?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {recipe.tags.map((tag: string) => (
                      <span key={tag} className="inline-block rounded-full bg-primary-50 px-2 py-0.5 text-caption font-medium text-primary-700">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              {recipe.allergens?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {recipe.allergens.map((g: any) => (
                    <span key={g.id} title={getAllergenName(g)} className="inline-flex items-center rounded-full bg-neutral-100 p-1">
                      <AllergenIcon icon={g.icon ?? null} color={g.color ?? null} size={12} />
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
