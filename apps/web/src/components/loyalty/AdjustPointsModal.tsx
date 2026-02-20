import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useAdjustLoyalty } from '@/api/hooks';

interface AdjustPointsModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  currentBalance: number;
}

export default function AdjustPointsModal({ open, onClose, customerId, currentBalance }: AdjustPointsModalProps) {
  const { t } = useTranslation();
  const adjustLoyalty = useAdjustLoyalty();
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    const numPoints = Number(points);
    if (!numPoints) return;
    adjustLoyalty.mutate(
      { customerId, points: numPoints, description: description || undefined },
      {
        onSuccess: () => {
          setPoints('');
          setDescription('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('loyalty.adjustModal.title')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSubmit} loading={adjustLoyalty.isPending} disabled={!Number(points)}>
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      <Stack gap={3}>
        <p className="text-body-sm text-neutral-500">
          {t('loyalty.adjustModal.currentBalance')}: <span className="font-semibold text-neutral-800">{currentBalance}</span>
        </p>
        <TextInput
          label={t('loyalty.adjustModal.points')}
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          hint={t('loyalty.adjustModal.pointsHint')}
        />
        <TextInput
          label={t('loyalty.adjustModal.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('loyalty.adjustModal.descriptionPlaceholder')}
        />
      </Stack>
    </Modal>
  );
}
