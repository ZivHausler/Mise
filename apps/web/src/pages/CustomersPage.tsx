import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users } from 'lucide-react';
import { Page, PageHeader, Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { DataTable, EmptyState, type Column } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { Modal } from '@/components/Modal';
import { TextInput, TextArea } from '@/components/FormFields';
import { useCustomers, useCreateCustomer } from '@/api/hooks';

export default function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: customers, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

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

  const handleCreate = useCallback(() => {
    createCustomer.mutate(form, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ name: '', phone: '', email: '', address: '', notes: '' });
      },
    });
  }, [form, createCustomer]);

  if (isLoading) return <PageLoading />;

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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('customers.create', 'New Customer')} size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate} loading={createCustomer.isPending}>{t('common.save')}</Button>
          </>
        }
      >
        <Stack gap={4}>
          <TextInput label={t('customers.name', 'Name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required dir="auto" />
          <TextInput label={t('customers.phone', 'Phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required dir="ltr" type="tel" />
          <TextInput label={t('customers.email', 'Email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" type="email" />
          <TextArea label={t('customers.address', 'Address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} dir="auto" />
          <TextArea label={t('customers.notes', 'Notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} dir="auto" />
        </Stack>
      </Modal>
    </Page>
  );
}
