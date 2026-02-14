import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Trash2, Edit } from 'lucide-react';
import { Page, Card, Section, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { StatusBadge } from '@/components/DataDisplay';
import { Button } from '@/components/Button';
import { PageLoading } from '@/components/Feedback';
import { ConfirmModal } from '@/components/Modal';
import { useOrder, useUpdateOrder, useDeleteOrder } from '@/api/hooks';

const nextStatusMap: Record<string, string | null> = {
  received: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
  delivered: null,
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id!);
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const [showDelete, setShowDelete] = React.useState(false);

  const o = order as any;

  const handleAdvance = useCallback(() => {
    if (!o) return;
    const next = nextStatusMap[o.status];
    if (next) updateOrder.mutate({ id: o.id, status: next });
  }, [o, updateOrder]);

  const handleDelete = useCallback(() => {
    if (!o) return;
    deleteOrder.mutate(o.id, { onSuccess: () => navigate('/orders') });
  }, [o, deleteOrder, navigate]);

  if (isLoading) return <PageLoading />;
  if (!o) return null;

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: t('nav.orders'), path: '/orders' },
          { label: `#${o.orderNumber ?? o.id}` },
        ]}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-h1 text-neutral-800">
            {t('orders.orderNum', 'Order')} #{o.orderNumber ?? o.id}
          </h1>
          <StatusBadge variant={o.status} label={t(`orders.status.${o.status}`, o.status)} />
        </div>
        <Row gap={2}>
          {nextStatusMap[o.status] && (
            <Button
              variant="primary"
              icon={<ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />}
              iconPosition="end"
              onClick={handleAdvance}
              loading={updateOrder.isPending}
            >
              {t('orders.advance', 'Advance')}
            </Button>
          )}
          <Button variant="secondary" icon={<Edit className="h-4 w-4" />} onClick={() => navigate(`/orders/${o.id}/edit`)}>
            {t('common.edit')}
          </Button>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowDelete(true)}>
            {t('common.delete')}
          </Button>
        </Row>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Section title={t('orders.details', 'Details')}>
            <Stack gap={3}>
              <DetailRow label={t('orders.customer', 'Customer')} value={o.customerName ?? '-'} />
              <DetailRow label={t('orders.dueDate', 'Due Date')} value={o.dueDate ?? '-'} />
              <DetailRow label={t('orders.total', 'Total')} value={`${o.total ?? 0} NIS`} />
            </Stack>
          </Section>
        </Card>

        <Card>
          <Section title={t('orders.items', 'Items')}>
            {o.items?.length ? (
              <div className="rounded-md border border-neutral-200">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b bg-neutral-100">
                      <th className="px-3 py-2 text-start font-semibold">{t('orders.recipe', 'Recipe')}</th>
                      <th className="px-3 py-2 text-end font-semibold">{t('orders.qty', 'Qty')}</th>
                      <th className="px-3 py-2 text-end font-semibold">{t('orders.price', 'Price')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-neutral-100">
                        <td className="px-3 py-2">{item.recipeName ?? item.name}</td>
                        <td className="px-3 py-2 text-end font-mono">{item.quantity}</td>
                        <td className="px-3 py-2 text-end font-mono">{item.price} NIS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-body-sm text-neutral-400">{t('orders.noItems', 'No items')}</p>
            )}
          </Section>
        </Card>
      </div>

      {o.notes && (
        <Card className="mt-6">
          <Section title={t('orders.notes', 'Notes')}>
            <p className="text-body-sm text-neutral-600">{o.notes}</p>
          </Section>
        </Card>
      )}

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={t('orders.deleteTitle', 'Delete Order?')}
        message={t('orders.deleteMsg', 'This action cannot be undone.')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        loading={deleteOrder.isPending}
      />
    </Page>
  );
}

const DetailRow = React.memo(function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-body-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800">{value}</span>
    </div>
  );
});
