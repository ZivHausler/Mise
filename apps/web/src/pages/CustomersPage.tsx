import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users, X } from 'lucide-react';
import { Page, PageHeader } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, EmptyState, type Column } from '@/components/DataDisplay';
import { PageSkeleton } from '@/components/Feedback';
import { NewCustomerModal } from '@/components/NewCustomerModal';
import { FilterDropdown, FilterOption } from '@/components/FilterDropdown';
import { useCustomers, useFeatureFlags } from '@/api/hooks';

const SEGMENT_STYLES: Record<string, string> = {
  vip: 'bg-amber-100 text-amber-800',
  regular: 'bg-primary-50 text-primary-700',
  new: 'bg-blue-50 text-blue-700',
  dormant: 'bg-neutral-100 text-neutral-500',
  inactive: 'bg-neutral-100 text-neutral-400',
};

const SEGMENTS = ['vip', 'regular', 'new', 'dormant', 'inactive'] as const;

export default function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: featureFlags } = useFeatureFlags();
  const loyaltyEnhancements = (featureFlags as any)?.loyaltyEnhancements ?? false;

  const segmentParam = searchParams.get('segment') ?? undefined;
  const [segmentFilter, setSegmentFilter] = useState<string | undefined>(segmentParam);

  const { data: customers, isLoading } = useCustomers(
    loyaltyEnhancements && segmentFilter ? { segment: segmentFilter } : undefined,
  );
  const [showAdd, setShowAdd] = useState(false);

  const handleSegmentChange = (segment: string | undefined) => {
    setSegmentFilter(segment);
    if (segment) {
      setSearchParams({ segment });
    } else {
      setSearchParams({});
    }
  };

  const columns: Column<any>[] = useMemo(
    () => {
      const cols: Column<any>[] = [
        { key: 'name', header: t('customers.name', 'Name'), sortable: true },
      ];

      if (loyaltyEnhancements) {
        cols.push({
          key: 'segment',
          header: t('customers.segment', 'Segment'),
          render: (row: any) => {
            const seg = row.segment;
            if (!seg) return null;
            const style = SEGMENT_STYLES[seg] ?? 'bg-neutral-100 text-neutral-500';
            return (
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-caption font-semibold ${style}`}>
                {t(`loyalty.segments.${seg}`, seg)}
              </span>
            );
          },
        });
      }

      cols.push(
        { key: 'phone', header: t('customers.phone', 'Phone'), render: (row: any) => <span dir="ltr">{row.phone}</span> },
        { key: 'email', header: t('customers.email', 'Email'), render: (row: any) => <span dir="ltr">{row.email}</span> },
        { key: 'orderCount', header: t('customers.orders', 'Orders'), align: 'end' as const, sortable: true },
        {
          key: 'totalSpent',
          header: t('customers.totalSpent', 'Total Spent'),
          align: 'end' as const,
          sortable: true,
          render: (row: any) => <span className="font-mono">{row.totalSpent ?? 0} {t('common.currency')}</span>,
        },
      );

      return cols;
    },
    [t, loyaltyEnhancements],
  );

  if (isLoading) return <PageSkeleton />;

  const list = (customers as any[]) ?? [];

  return (
    <Page>
      <PageHeader
        title={t('nav.customers')}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            {t('customers.create', 'New Customer')}
          </Button>
        }
      />

      {loyaltyEnhancements && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterDropdown
            label={t('customers.segment', 'Segment')}
            count={segmentFilter ? 1 : 0}
          >
            <FilterOption selected={!segmentFilter} onClick={() => handleSegmentChange(undefined)}>
              {t('common.all', 'All')}
            </FilterOption>
            {SEGMENTS.map((seg) => (
              <FilterOption key={seg} selected={segmentFilter === seg} onClick={() => handleSegmentChange(seg)}>
                {t(`loyalty.segments.${seg}`, seg)}
              </FilterOption>
            ))}
          </FilterDropdown>
          {segmentFilter && (
            <button
              onClick={() => handleSegmentChange(undefined)}
              className="inline-flex items-center gap-1 text-body-sm text-neutral-500 hover:text-neutral-700"
            >
              <X className="h-3.5 w-3.5" />
              {t('common.clearFilters', 'Clear')}
            </button>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          title={t('customers.empty', 'No customers yet')}
          description={t('customers.emptyDesc', 'Add your first customer.')}
          icon={<Users className="h-16 w-16" />}
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
              {t('customers.create', 'New Customer')}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={list}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => navigate(`/customers/${row.id}`)}
          searchable
          searchPlaceholder={t('customers.searchPlaceholder', 'Search customers...')}
        />
      )}

      <NewCustomerModal open={showAdd} onClose={() => setShowAdd(false)} />
    </Page>
  );
}
