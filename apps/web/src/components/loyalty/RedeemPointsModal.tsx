import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useRedeemLoyalty, useLoyaltyConfig } from '@/api/hooks';

interface RedeemPointsModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  currentBalance: number;
}

export default function RedeemPointsModal({ open, onClose, customerId, currentBalance }: RedeemPointsModalProps) {
  const { t } = useTranslation();
  const redeemLoyalty = useRedeemLoyalty();
  const { data: rawConfig } = useLoyaltyConfig();
  const config = rawConfig as { pointValue: number; minRedeemPoints: number } | undefined;
  const [points, setPoints] = useState('');

  const numPoints = Number(points) || 0;
  const shekelValue = numPoints * (config?.pointValue ?? 0.1);
  const minPoints = config?.minRedeemPoints ?? 0;
  const isValid = numPoints > 0 && numPoints <= currentBalance && numPoints >= minPoints;

  const handleSubmit = () => {
    if (!isValid) return;
    redeemLoyalty.mutate(
      { customerId, points: numPoints },
      {
        onSuccess: () => {
          setPoints('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('loyalty.redeemModal.title')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSubmit} loading={redeemLoyalty.isPending} disabled={!isValid}>
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      <Stack gap={3}>
        <p className="text-body-sm text-neutral-500">
          {t('loyalty.redeemModal.currentBalance')}: <span className="font-semibold text-neutral-800">{currentBalance}</span>
        </p>
        <TextInput
          label={t('loyalty.redeemModal.points')}
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          min="1"
          max={String(currentBalance)}
        />
        {numPoints > 0 && (
          <div className="rounded-md bg-success-light p-3 text-body-sm text-success-dark">
            {t('loyalty.redeemModal.discount')}: <span className="font-semibold">₪{shekelValue.toFixed(2)}</span>
          </div>
        )}
        {minPoints > 0 && (
          <p className="text-body-sm text-neutral-400">
            {t('loyalty.redeemModal.minPoints', { min: minPoints })}
          </p>
        )}
      </Stack>
    </Modal>
  );
}
