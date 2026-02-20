import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/Modal';
import { OrderForm } from '@/components/OrderForm';

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  defaultDueDate?: string;
}

export function NewOrderModal({ open, onClose, defaultDueDate }: NewOrderModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={t('orders.create', 'New Order')} size="lg">
      <OrderForm
        defaultDueDate={defaultDueDate}
        onSuccess={() => onClose()}
        onCancel={onClose}
      />
    </Modal>
  );
}
