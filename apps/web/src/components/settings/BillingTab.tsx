import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Card, Section, Stack } from '@/components/Layout';
import { TextInput } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useCurrentStore, useUpdateBusinessInfo } from '@/api/hooks';

export default function BillingTab() {
  const { t } = useTranslation();
  const { data: store, isLoading } = useCurrentStore();
  const updateBusinessInfo = useUpdateBusinessInfo();

  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vatRate, setVatRate] = useState('18');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (store) {
      setBusinessName(store.name ?? '');
      setBusinessId(store.taxNumber ?? '');
      setAddress(store.address ?? '');
      setPhone(store.phone ?? '');
      setEmail(store.email ?? '');
      setVatRate(String(store.vatRate ?? 18));
      setDirty(false);
    }
  }, [store]);

  const handleFieldChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setDirty(true);
  };

  const handleSave = () => {
    updateBusinessInfo.mutate(
      {
        name: businessName || undefined,
        address: address || undefined,
        taxNumber: businessId || undefined,
        phone: phone || undefined,
        email: email || undefined,
        vatRate: vatRate ? Number(vatRate) : undefined,
      },
      { onSuccess: () => setDirty(false) },
    );
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={6}>
      <Card>
        <Section title={t('settings.billing.businessDetails', 'Business Details')}>
          <Stack gap={3}>
            <TextInput
              label={t('settings.billing.businessName', 'Business Name')}
              value={businessName}
              onChange={handleFieldChange(setBusinessName)}
            />
            <TextInput
              label={t('settings.billing.businessId', 'Business ID (ח.פ.)')}
              value={businessId}
              onChange={handleFieldChange(setBusinessId)}
              dir="ltr"
            />
            <TextInput
              label={t('settings.billing.address', 'Address')}
              value={address}
              onChange={handleFieldChange(setAddress)}
            />
            <TextInput
              label={t('settings.billing.phone', 'Phone')}
              value={phone}
              onChange={handleFieldChange(setPhone)}
              dir="ltr"
            />
            <TextInput
              label={t('settings.billing.email', 'Email')}
              value={email}
              onChange={handleFieldChange(setEmail)}
              dir="ltr"
            />
          </Stack>
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.billing.invoiceSettings', 'Invoice Settings')}>
          <Stack gap={3}>
            <TextInput
              label={t('settings.billing.vatRate', 'VAT Rate (%)')}
              type="number"
              value={vatRate}
              onChange={handleFieldChange(setVatRate)}
              dir="ltr"
            />
            <p className="text-body-sm text-neutral-500">
              {t('settings.billing.vatRateNote', 'Changes to VAT rate will only affect future invoices.')}
            </p>
          </Stack>
        </Section>
      </Card>

      {dirty && (
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            loading={updateBusinessInfo.isPending}
          >
            {t('common.save')}
          </Button>
        </div>
      )}
    </Stack>
  );
}
