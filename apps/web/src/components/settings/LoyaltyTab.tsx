import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Card, Section, Stack } from '@/components/Layout';
import { TextInput, Toggle } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useLoyaltyConfig, useUpdateLoyaltyConfig } from '@/api/hooks';

export default function LoyaltyTab() {
  const { t } = useTranslation();
  const { data: rawConfig, isLoading } = useLoyaltyConfig();
  const updateConfig = useUpdateLoyaltyConfig();

  const config = rawConfig as { isActive: boolean; pointsPerShekel: number; pointValue: number; minRedeemPoints: number } | undefined;

  const [isActive, setIsActive] = useState(false);
  const [pointsPerShekel, setPointsPerShekel] = useState('1');
  const [pointValue, setPointValue] = useState('0.1');
  const [minRedeemPoints, setMinRedeemPoints] = useState('0');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setIsActive(config.isActive);
      setPointsPerShekel(String(config.pointsPerShekel));
      setPointValue(String(config.pointValue));
      setMinRedeemPoints(String(config.minRedeemPoints));
      setDirty(false);
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate(
      {
        isActive,
        pointsPerShekel: Number(pointsPerShekel),
        pointValue: Number(pointValue),
        minRedeemPoints: Number(minRedeemPoints),
      },
      { onSuccess: () => setDirty(false) },
    );
  };

  const previewPurchase = 10;
  const previewPoints = Math.floor(previewPurchase * Number(pointsPerShekel || 0));
  const previewValue = (previewPoints * Number(pointValue || 0)).toFixed(2);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={6}>
      <Card>
        <Section title={t('settings.loyalty.title', 'Loyalty Program')}>
          <Stack gap={3}>
            <Toggle
              label={t('settings.loyalty.isActive', 'Enable Program')}
              checked={isActive}
              onChange={(v) => { setIsActive(v); setDirty(true); }}
            />
            <TextInput
              label={t('settings.loyalty.pointsPerShekel', 'Points per ₪')}
              type="number"
              value={pointsPerShekel}
              onChange={(e) => { setPointsPerShekel(e.target.value); setDirty(true); }}
              min="0.01"
              step="0.1"
            />
            <TextInput
              label={t('settings.loyalty.pointValue', 'Point Value (₪)')}
              type="number"
              value={pointValue}
              onChange={(e) => { setPointValue(e.target.value); setDirty(true); }}
              min="0.001"
              step="0.01"
            />
            <TextInput
              label={t('settings.loyalty.minRedeemPoints', 'Min. Redeem Points')}
              type="number"
              value={minRedeemPoints}
              onChange={(e) => { setMinRedeemPoints(e.target.value); setDirty(true); }}
              min="0"
              step="1"
            />
            <div className="rounded-md bg-primary-50 p-3 text-body-sm text-primary-700">
              {t('settings.loyalty.preview', '₪{{purchase}} purchase = {{points}} points = ₪{{value}} on redemption', {
                purchase: previewPurchase,
                points: previewPoints,
                value: previewValue,
              })}
            </div>
            {dirty && (
              <div className="flex justify-center pt-3">
                <Button variant="primary" size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSave} loading={updateConfig.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            )}
          </Stack>
        </Section>
      </Card>
    </Stack>
  );
}
