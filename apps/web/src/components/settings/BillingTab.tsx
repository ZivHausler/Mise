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
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(false);
  const [autoGenerateCreditNote, setAutoGenerateCreditNote] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (store) {
      setBusinessName(store.name ?? '');
      setBusinessId(store.taxNumber ?? '');
      setAddress(store.address ?? '');
      setPhone(store.phone ?? '');
      setEmail(store.email ?? '');
      setVatRate(String(store.vatRate ?? 18));
      setAutoGenerateInvoice(!!store.autoGenerateInvoice);
      setAutoGenerateCreditNote(!!store.autoGenerateCreditNote);
      setDirty(false);
    }
  }, [store]);

  const handleFieldChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setDirty(true);
  };

  const handleSave = () => {
    const hasTax = !!businessId;
    updateBusinessInfo.mutate(
      {
        name: businessName || undefined,
        address: address || undefined,
        taxNumber: businessId || undefined,
        phone: phone || undefined,
        email: email || undefined,
        vatRate: vatRate ? Number(vatRate) : undefined,
        autoGenerateInvoice: hasTax ? autoGenerateInvoice : false,
        autoGenerateCreditNote: hasTax ? autoGenerateCreditNote : false,
      },
      {
        onSuccess: () => {
          if (!hasTax) {
            setAutoGenerateInvoice(false);
            setAutoGenerateCreditNote(false);
          }
          setDirty(false);
        },
      },
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

            {!!store?.taxNumber && (
            <div className="border-t border-neutral-200 pt-4 mt-1">
              <h4 className="text-body-sm font-semibold text-neutral-700 mb-3">
                {t('settings.billing.automation', 'Automation')}
              </h4>
              <Stack gap={4}>
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="text-body-sm font-medium text-neutral-700">
                      {t('settings.billing.autoGenerateInvoice', 'Auto-generate invoice')}
                    </span>
                    <p className="text-body-sm text-neutral-500 mt-0.5">
                      {t('settings.billing.autoGenerateInvoiceDesc', 'Automatically create an invoice when a payment is logged.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoGenerateInvoice}
                    onClick={() => { setAutoGenerateInvoice((v) => !v); setDirty(true); }}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${autoGenerateInvoice ? 'bg-primary-500' : 'bg-neutral-300'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoGenerateInvoice ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="text-body-sm font-medium text-neutral-700">
                      {t('settings.billing.autoGenerateCreditNote', 'Auto-generate credit note')}
                    </span>
                    <p className="text-body-sm text-neutral-500 mt-0.5">
                      {t('settings.billing.autoGenerateCreditNoteDesc', 'Automatically create a credit note when a refund is processed.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoGenerateCreditNote}
                    onClick={() => { setAutoGenerateCreditNote((v) => !v); setDirty(true); }}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${autoGenerateCreditNote ? 'bg-primary-500' : 'bg-neutral-300'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoGenerateCreditNote ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </Stack>
            </div>
            )}
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
