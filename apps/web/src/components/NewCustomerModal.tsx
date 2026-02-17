import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextInput, TextArea } from '@/components/FormFields';
import { useCreateCustomer, useCustomer } from '@/api/hooks';

interface NewCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (customer: any) => void;
  allowUseExisting?: boolean;
}

export function NewCustomerModal({ open, onClose, onCreated, allowUseExisting = false }: NewCustomerModalProps) {
  const { t } = useTranslation();
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);
  const { data: existingCustomer } = useCustomer(existingCustomerId ?? '');

  const resetAndClose = useCallback(() => {
    setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    setExistingCustomerId(null);
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(() => {
    createCustomer.mutate(form, {
      onSuccess: (data: any) => {
        setForm({ name: '', phone: '', email: '', address: '', notes: '' });
        setExistingCustomerId(null);
        onClose();
        onCreated?.(data);
      },
      onError: (error: any) => {
        const code = error?.response?.data?.error?.code;
        const id = error?.response?.data?.error?.data?.existingCustomerId;
        if ((code === 'CUSTOMER_PHONE_EXISTS' || code === 'CUSTOMER_EMAIL_EXISTS') && id) {
          setExistingCustomerId(id);
        }
      },
    });
  }, [form, createCustomer, onClose, onCreated]);

  const handleUseExisting = useCallback(() => {
    if (existingCustomer) {
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
      setExistingCustomerId(null);
      onClose();
      onCreated?.(existingCustomer);
    }
  }, [existingCustomer, onClose, onCreated]);

  const ec = existingCustomer as any;

  return (
    <>
      <Modal open={open} onClose={resetAndClose} title={t('customers.create', 'New Customer')} size="md"
        footer={
          <>
            <Button variant="secondary" onClick={resetAndClose}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate} loading={createCustomer.isPending}>{t('common.save')}</Button>
          </>
        }
      >
        <Stack gap={4}>
          <TextInput label={t('customers.name', 'Name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required dir="auto" />
          <TextInput label={t('customers.phone', 'Phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required dir="ltr" type="tel" />
          <TextInput label={t('customers.email', 'Email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" type="email" />
          <TextArea label={t('customers.address', 'Address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} dir="auto" />
          <TextArea label={t('customers.notes', 'Notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} dir="auto" />
        </Stack>
      </Modal>

      <Modal
        open={!!existingCustomerId && !!ec}
        onClose={() => setExistingCustomerId(null)}
        title={t('customers.existingFound', 'Customer Already Exists')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExistingCustomerId(null)}>{t('common.back', 'Back')}</Button>
            {allowUseExisting && (
              <Button variant="primary" onClick={handleUseExisting}>{t('customers.useExisting', 'Use This Customer')}</Button>
            )}
          </>
        }
      >
        {ec && (
          <Stack gap={3}>
            <p className="text-body text-neutral-600">
              {allowUseExisting
                ? t('customers.existingFoundDesc', 'A customer with this contact info already exists. Would you like to use them instead?')
                : t('customers.existingFoundInfoDesc', 'A customer with this contact info already exists.')
              }
            </p>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <Stack gap={2}>
                <div className="flex justify-between text-body-sm">
                  <span className="text-neutral-500">{t('customers.name', 'Name')}</span>
                  <span className="font-medium text-neutral-800">{ec.name}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-neutral-500">{t('customers.phone', 'Phone')}</span>
                  <span className="font-medium text-neutral-800" dir="ltr">{ec.phone}</span>
                </div>
                {ec.email && (
                  <div className="flex justify-between text-body-sm">
                    <span className="text-neutral-500">{t('customers.email', 'Email')}</span>
                    <span className="font-medium text-neutral-800" dir="ltr">{ec.email}</span>
                  </div>
                )}
                {ec.address && (
                  <div className="flex justify-between text-body-sm">
                    <span className="text-neutral-500">{t('customers.address', 'Address')}</span>
                    <span className="font-medium text-neutral-800">{ec.address}</span>
                  </div>
                )}
              </Stack>
            </div>
          </Stack>
        )}
      </Modal>
    </>
  );
}
