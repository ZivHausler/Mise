import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Section, Stack } from '@/components/Layout';
import { TextInput, Toggle } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useLoyaltyConfig, useUpdateLoyaltyConfig, useFeatureFlags } from '@/api/hooks';

interface SegmentationConfig {
  segmentVipOrderCount?: number;
  segmentVipDays?: number;
  segmentRegularOrderCount?: number;
  segmentRegularDays?: number;
  segmentNewDays?: number;
  segmentDormantDays?: number;
  birthdayReminderDays?: number;
}

export default function LoyaltyTab() {
  const { t } = useTranslation();
  const { data: rawConfig, isLoading } = useLoyaltyConfig();
  const updateConfig = useUpdateLoyaltyConfig();
  const { data: featureFlags } = useFeatureFlags();
  const loyaltyEnhancements = (featureFlags as any)?.loyaltyEnhancements ?? false;

  const config = rawConfig as {
    isActive: boolean;
    pointsPerShekel: number;
    pointValue: number;
    minRedeemPoints: number;
  } & SegmentationConfig | undefined;

  const [isActive, setIsActive] = useState(false);
  const [pointsPerShekel, setPointsPerShekel] = useState('1');
  const [pointValue, setPointValue] = useState('0.1');
  const [minRedeemPoints, setMinRedeemPoints] = useState('0');
  const [dirty, setDirty] = useState(false);

  // Segmentation fields
  const [segExpanded, setSegExpanded] = useState(false);
  const [segVipOrderCount, setSegVipOrderCount] = useState('5');
  const [segVipDays, setSegVipDays] = useState('90');
  const [segRegularOrderCount, setSegRegularOrderCount] = useState('2');
  const [segRegularDays, setSegRegularDays] = useState('90');
  const [segNewDays, setSegNewDays] = useState('30');
  const [segDormantDays, setSegDormantDays] = useState('30');
  const [birthdayReminderDays, setBirthdayReminderDays] = useState('7');

  useEffect(() => {
    if (config) {
      setIsActive(config.isActive);
      setPointsPerShekel(String(config.pointsPerShekel));
      setPointValue(String(config.pointValue));
      setMinRedeemPoints(String(config.minRedeemPoints));
      // Segmentation fields
      if (config.segmentVipOrderCount !== undefined) setSegVipOrderCount(String(config.segmentVipOrderCount));
      if (config.segmentVipDays !== undefined) setSegVipDays(String(config.segmentVipDays));
      if (config.segmentRegularOrderCount !== undefined) setSegRegularOrderCount(String(config.segmentRegularOrderCount));
      if (config.segmentRegularDays !== undefined) setSegRegularDays(String(config.segmentRegularDays));
      if (config.segmentNewDays !== undefined) setSegNewDays(String(config.segmentNewDays));
      if (config.segmentDormantDays !== undefined) setSegDormantDays(String(config.segmentDormantDays));
      if (config.birthdayReminderDays !== undefined) setBirthdayReminderDays(String(config.birthdayReminderDays));
      setDirty(false);
    }
  }, [config]);

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      isActive,
      pointsPerShekel: Number(pointsPerShekel),
      pointValue: Number(pointValue),
      minRedeemPoints: Number(minRedeemPoints),
    };

    if (loyaltyEnhancements) {
      payload.segmentVipOrderCount = Number(segVipOrderCount);
      payload.segmentVipDays = Number(segVipDays);
      payload.segmentRegularOrderCount = Number(segRegularOrderCount);
      payload.segmentRegularDays = Number(segRegularDays);
      payload.segmentNewDays = Number(segNewDays);
      payload.segmentDormantDays = Number(segDormantDays);
      payload.birthdayReminderDays = Number(birthdayReminderDays);
    }

    updateConfig.mutate(payload, { onSuccess: () => setDirty(false) });
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

      {loyaltyEnhancements && (
        <Card>
          <button
            type="button"
            onClick={() => setSegExpanded((v) => !v)}
            className="flex w-full items-center justify-between py-1 text-start"
          >
            <div>
              <h3 className="text-body font-semibold text-neutral-800">
                {t('loyalty.settings.segmentation', 'Segmentation Settings')}
              </h3>
              <p className="text-body-sm text-neutral-500">
                {t('loyalty.settings.segmentationDesc', 'Configure how customers are automatically categorized')}
              </p>
            </div>
            {segExpanded ? <ChevronUp className="h-5 w-5 text-neutral-400" /> : <ChevronDown className="h-5 w-5 text-neutral-400" />}
          </button>

          {segExpanded && (
            <Stack gap={3} className="mt-4">
              <TextInput
                label={t('loyalty.settings.vipOrderCount', 'VIP: Minimum orders')}
                type="number"
                value={segVipOrderCount}
                onChange={(e) => { setSegVipOrderCount(e.target.value); setDirty(true); }}
                min="1"
                step="1"
              />
              <TextInput
                label={t('loyalty.settings.vipDays', 'VIP: Within days')}
                type="number"
                value={segVipDays}
                onChange={(e) => { setSegVipDays(e.target.value); setDirty(true); }}
                min="1"
                step="1"
              />
              <TextInput
                label={t('loyalty.settings.regularOrderCount', 'Regular: Minimum orders')}
                type="number"
                value={segRegularOrderCount}
                onChange={(e) => { setSegRegularOrderCount(e.target.value); setDirty(true); }}
                min="1"
                step="1"
              />
              <TextInput
                label={t('loyalty.settings.regularDays', 'Regular: Within days')}
                type="number"
                value={segRegularDays}
                onChange={(e) => { setSegRegularDays(e.target.value); setDirty(true); }}
                min="1"
                step="1"
              />
              <TextInput
                label={t('loyalty.settings.newDays', 'New customer: Within days')}
                type="number"
                value={segNewDays}
                onChange={(e) => { setSegNewDays(e.target.value); setDirty(true); }}
                min="1"
                step="1"
              />
              <TextInput
                label={t('loyalty.settings.dormantDays', 'Dormant: No orders for days')}
                type="number"
                value={segDormantDays}
                onChange={(e) => { setSegDormantDays(e.target.value); setDirty(true); }}
                min="1"
                step="1"
              />
              <TextInput
                label={t('loyalty.settings.birthdayReminderDays', 'Birthday reminder: Days ahead')}
                type="number"
                value={birthdayReminderDays}
                onChange={(e) => { setBirthdayReminderDays(e.target.value); setDirty(true); }}
                min="1"
                step="1"
              />
              {dirty && (
                <div className="flex justify-center pt-3">
                  <Button variant="primary" size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSave} loading={updateConfig.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              )}
            </Stack>
          )}
        </Card>
      )}
    </Stack>
  );
}
