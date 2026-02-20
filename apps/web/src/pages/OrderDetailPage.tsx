import React, { useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Trash2, Edit, BadgeDollarSign } from 'lucide-react';
import { Page, Card, Section, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { StatusBadge } from '@/components/DataDisplay';
import { Button } from '@/components/Button';
import { PageSkeleton } from '@/components/Feedback';
import { ConfirmModal } from '@/components/Modal';
import { useOrder, useUpdateOrderStatus, useDeleteOrder, usePaymentStatuses } from '@/api/hooks';
import { ORDER_STATUS, getStatusLabel } from '@/utils/orderStatus';
import { useFormatDate } from '@/utils/dateFormat';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id!);
  const updateOrderStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { data: paymentStatuses } = usePaymentStatuses();
  const [showDelete, setShowDelete] = React.useState(false);

  const formatDate = useFormatDate();
  const o = order as any;

  const handleAdvance = useCallback(() => {
    if (!o || o.status >= ORDER_STATUS.DELIVERED) return;
    updateOrderStatus.mutate({ id: o.id, status: o.status + 1 });
  }, [o, updateOrderStatus]);

  const handleRevert = useCallback(() => {
    if (!o || o.status <= ORDER_STATUS.RECEIVED) return;
    updateOrderStatus.mutate({ id: o.id, status: o.status - 1 });
  }, [o, updateOrderStatus]);

  const handleDelete = useCallback(() => {
    if (!o) return;
    deleteOrder.mutate(o.id, { onSuccess: () => navigate('/orders') });
  }, [o, deleteOrder, navigate]);

  if (isLoading) return <PageSkeleton />;
  if (!o) return null;

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: t('nav.orders'), path: '/orders' },
          { label: `#${o.orderNumber}` },
        ]}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-h1 text-neutral-800">
            {t('orders.orderNum', 'Order')} #{o.orderNumber}
          </h1>
          <StatusBadge variant={getStatusLabel(o.status)} label={t(`orders.status.${getStatusLabel(o.status)}`, getStatusLabel(o.status))} />
          {paymentStatuses?.[o.id] === 'paid' && <BadgeDollarSign className="h-6 w-6 text-green-600" />}
        </div>
        <Row gap={2} className="flex-wrap">
          {o.status > ORDER_STATUS.RECEIVED && (
            <Button
              variant="secondary"
              icon={<ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />}
              onClick={handleRevert}
              loading={updateOrderStatus.isPending}
            >
              {t('orders.revert', 'Back')}
            </Button>
          )}
          {o.status < ORDER_STATUS.DELIVERED && (
            <Button
              variant="primary"
              icon={<ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />}
              iconPosition="end"
              onClick={handleAdvance}
              loading={updateOrderStatus.isPending}
            >
              {t('orders.advance', 'Advance')}
            </Button>
          )}
          {o.status <= ORDER_STATUS.IN_PROGRESS && paymentStatuses?.[o.id] !== 'paid' && (
            <Button variant="secondary" icon={<Edit className="h-4 w-4" />} onClick={() => navigate(`/orders/${o.id}/edit`)}>
              {t('common.edit')}
            </Button>
          )}
          {o.status < ORDER_STATUS.DELIVERED && (
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowDelete(true)}>
              {t('common.delete')}
            </Button>
          )}
        </Row>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Section title={t('orders.details', 'Details')}>
            <Stack gap={3}>
              <div className="flex justify-between text-body-sm">
                <span className="text-neutral-500">{t('orders.customer', 'Customer')}</span>
                {o.customerId ? (
                  <Link to={`/customers/${o.customerId}`} className="font-medium text-primary-600 hover:underline">
                    {o.customerName ?? '-'}
                  </Link>
                ) : (
                  <span className="font-medium text-neutral-800">{o.customerName ?? '-'}</span>
                )}
              </div>
              <DetailRow label={t('orders.createdAt', 'Created')} value={o.createdAt ? formatDate(o.createdAt) : '-'} />
              <DetailRow label={t('orders.dueDate', 'Due Date')} value={o.dueDate ? formatDate(o.dueDate) : '-'} />
              <DetailRow label={t('orders.total', 'Total')} value={`${o.totalAmount ?? 0} ${t('common.currency')}`} />
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
                        <td className="px-3 py-2">{item.recipeName ?? item.name ?? '-'}</td>
                        <td className="px-3 py-2 text-end font-mono">{item.quantity}</td>
                        <td className="px-3 py-2 text-end font-mono">{item.unitPrice ?? item.price ?? 0} {t('common.currency')}</td>
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
