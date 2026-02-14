import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2 } from 'lucide-react';
import { Page, Card, Section, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/DataDisplay';
import { PageLoading } from '@/components/Feedback';
import { ConfirmModal } from '@/components/Modal';
import { useCustomer, useDeleteCustomer } from '@/api/hooks';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id!);
  const deleteCustomer = useDeleteCustomer();
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');

  const c = customer as any;

  if (isLoading) return <PageLoading />;
  if (!c) return null;

  return (
    <Page>
      <Breadcrumbs items={[{ label: t('nav.customers'), path: '/customers' }, { label: c.name }]} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-h1 text-neutral-800">{c.name}</h1>
        <Row gap={2}>
          <Button variant="secondary" icon={<Edit className="h-4 w-4" />} onClick={() => navigate(`/customers/${c.id}/edit`)}>
            {t('common.edit')}
          </Button>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowDelete(true)}>
            {t('common.delete')}
          </Button>
        </Row>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Section title={t('customers.contactInfo', 'Contact Info')}>
            <Stack gap={2}>
              {c.phone && <InfoRow label={t('customers.phone', 'Phone')} value={c.phone} dir="ltr" />}
              {c.email && <InfoRow label={t('customers.email', 'Email')} value={c.email} dir="ltr" />}
              {c.address && <InfoRow label={t('customers.address', 'Address')} value={c.address} />}
            </Stack>
          </Section>
        </Card>

        <Card>
          <Section title={t('customers.preferences', 'Preferences & Notes')}>
            <Stack gap={2}>
              {c.allergies && <InfoRow label={t('customers.allergies', 'Allergies')} value={c.allergies} />}
              {c.notes && <InfoRow label={t('customers.notes', 'Notes')} value={c.notes} />}
            </Stack>
            {!c.allergies && !c.notes && (
              <p className="text-body-sm text-neutral-400">{t('customers.noNotes', 'No notes or preferences.')}</p>
            )}
          </Section>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex gap-1 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-body-sm font-medium ${activeTab === 'orders' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500'}`}
          >
            {t('customers.orderHistory', 'Order History')}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2.5 text-body-sm font-medium ${activeTab === 'payments' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500'}`}
          >
            {t('nav.payments')}
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b bg-neutral-50">
                  <th className="px-3 py-2 text-start font-semibold">#</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('orders.dueDate', 'Date')}</th>
                  <th className="px-3 py-2 text-center font-semibold">{t('orders.statusLabel', 'Status')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('orders.total', 'Total')}</th>
                </tr>
              </thead>
              <tbody>
                {(c.orders ?? []).map((o: any) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer border-b border-neutral-100 hover:bg-primary-50"
                    onClick={() => navigate(`/orders/${o.id}`)}
                  >
                    <td className="px-3 py-2">#{o.orderNumber ?? o.id}</td>
                    <td className="px-3 py-2">{o.dueDate ?? o.createdAt}</td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge variant={['received','in_progress','ready','delivered'][o.status]} label={['received','in_progress','ready','delivered'][o.status]} />
                    </td>
                    <td className="px-3 py-2 text-end font-mono">{o.total} {t('common.currency')}</td>
                  </tr>
                ))}
                {(c.orders ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-neutral-400">
                      {t('customers.noOrders', 'No orders yet.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payments' && (
          <p className="py-8 text-center text-body-sm text-neutral-400">
            {t('customers.noPayments', 'Payment history will appear here.')}
          </p>
        )}
      </Card>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteCustomer.mutate(c.id, { onSuccess: () => navigate('/customers') })}
        title={t('customers.deleteTitle', 'Delete Customer?')}
        message={t('customers.deleteMsg', 'This will permanently remove the customer.')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        loading={deleteCustomer.isPending}
      />
    </Page>
  );
}

const InfoRow = React.memo(function InfoRow({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex justify-between text-body-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800" dir={dir}>{value}</span>
    </div>
  );
});
