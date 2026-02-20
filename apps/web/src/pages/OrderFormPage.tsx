import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page, Card } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { OrderForm } from '@/components/OrderForm';
import { useOrder } from '@/api/hooks';

export default function OrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: existingOrder } = useOrder(id ?? '');

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: t('nav.orders'), path: '/orders' },
          { label: isEdit ? t('common.edit') : t('orders.create', 'New Order') },
        ]}
      />

      <Card>
        <OrderForm
          existingOrder={isEdit ? existingOrder : undefined}
          onSuccess={() => isEdit ? navigate(`/orders/${id}`) : navigate('/orders')}
          onCancel={() => navigate(-1 as any)}
        />
      </Card>
    </Page>
  );
}
