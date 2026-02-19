import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users } from 'lucide-react';
import { Page, PageHeader } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, EmptyState, type Column } from '@/components/DataDisplay';
import { PageSkeleton } from '@/components/Feedback';
import { NewCustomerModal } from '@/components/NewCustomerModal';
import { useCustomers } from '@/api/hooks';

export default function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: customers, isLoading } = useCustomers();
  const [showAdd, setShowAdd] = useState(false);

  const columns: Column<any>[] = useMemo(
    () => [
      { key: 'name', header: t('customers.name', 'Name'), sortable: true },
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
    ],
    [t]
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
