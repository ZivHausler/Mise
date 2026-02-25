import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextInput, TextArea } from '@/components/FormFields';
import { useCreateCustomer, useCustomer } from '@/api/hooks';

interface Conflict {
  field: 'phone' | 'email';
  customerId: number;
}

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
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflictIdx, setSelectedConflictIdx] = useState<number | null>(null);

  // Fetch customer data for each conflict
  const { data: conflictCustomer0 } = useCustomer(conflicts[0]?.customerId ?? 0);
  const { data: conflictCustomer1 } = useCustomer(conflicts[1]?.customerId ?? 0);
  const conflictCustomers = [conflictCustomer0, conflictCustomer1].filter(Boolean);

  const resetAndClose = useCallback(() => {
    setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    setConflicts([]);
    setSelectedConflictIdx(null);
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(() => {
    createCustomer.mutate(form, {
      onSuccess: (data: any) => {
        setForm({ name: '', phone: '', email: '', address: '', notes: '' });
        setConflicts([]);
        setSelectedConflictIdx(0);
        onClose();
        onCreated?.(data);
      },
      onError: (error: any) => {
        const code = error?.response?.data?.error?.code;
        const data = error?.response?.data?.error?.data;

        if (code === 'CUSTOMER_CONFLICT' && data?.conflicts?.length) {
          setConflicts(data.conflicts);
          setSelectedConflictIdx(null);
          return;
        }

        // Backwards compat with old single-conflict codes
        const id = data?.existingCustomerId;
        if ((code === 'CUSTOMER_PHONE_EXISTS' || code === 'CUSTOMER_EMAIL_EXISTS') && id) {
          const field = code === 'CUSTOMER_PHONE_EXISTS' ? 'phone' : 'email';
          setConflicts([{ field, customerId: id }]);
          setSelectedConflictIdx(0);
        }
      },
    });
  }, [form, createCustomer, onClose, onCreated]);

  const handleUseExisting = useCallback(() => {
    const customer = selectedConflictIdx !== null ? conflictCustomers[selectedConflictIdx] : conflictCustomers[0];
    if (customer) {
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
      setConflicts([]);
      setSelectedConflictIdx(0);
      onClose();
      onCreated?.(customer);
    }
  }, [conflicts, conflictCustomers, selectedConflictIdx, onClose, onCreated]);

  const showConflictModal = conflicts.length > 0 && conflictCustomers.length > 0;
  const hasMultipleConflicts = conflicts.length > 1 && conflictCustomers.length > 1;

  return (
    <>
      <Modal open={open} onClose={resetAndClose} onConfirm={handleCreate} title={t('customers.create', 'New Customer')} size="md"
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
        open={showConflictModal}
        onClose={() => setConflicts([])}
        onConfirm={handleUseExisting}
        title={t('customers.existingFound', 'Customer Already Exists')}
        size={hasMultipleConflicts ? 'md' : 'sm'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConflicts([])}>{t('common.back', 'Back')}</Button>
            {allowUseExisting && (
              <Button variant="primary" onClick={handleUseExisting} disabled={hasMultipleConflicts && selectedConflictIdx === null}>{t('customers.useExisting', 'Use This Customer')}</Button>
            )}
          </>
        }
      >
        <Stack gap={3}>
          {hasMultipleConflicts ? (
            <>
              <p className="text-body text-neutral-600">
                {allowUseExisting
                  ? t('customers.multiConflictDesc', 'We found existing customers matching your contact info. Choose which one to use:')
                  : t('customers.multiConflictInfoDesc', 'We found existing customers matching your contact info:')}
              </p>
              <Stack gap={2}>
                {conflicts.map((conflict, idx) => {
                  const ec = conflictCustomers[idx] as any;
                  if (!ec) return null;
                  const isSelected = selectedConflictIdx === idx;
                  return (
                    <button
                      key={conflict.customerId}
                      type="button"
                      onClick={() => setSelectedConflictIdx(idx)}
                      className={`w-full rounded-lg border p-4 text-start transition-colors ${
                        isSelected
                          ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-400'
                          : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                          conflict.field === 'phone'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {t(`customers.conflictField.${conflict.field}`, conflict.field)}
                        </span>
                        <span className="text-caption text-neutral-400">
                          {t('customers.conflictMatch', 'match')}
                        </span>
                      </div>
                      <CustomerDetails customer={ec} t={t} />
                    </button>
                  );
                })}
              </Stack>
            </>
          ) : (
            <>
              <p className="text-body text-neutral-600">
                {allowUseExisting
                  ? t('customers.existingFoundDesc', 'A customer with this contact info already exists. Would you like to use them instead?')
                  : t('customers.existingFoundInfoDesc', 'A customer with this contact info already exists.')}
              </p>
              {conflictCustomers[0] && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <CustomerDetails customer={conflictCustomers[0] as any} t={t} />
                </div>
              )}
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}

function CustomerDetails({ customer, t }: { customer: any; t: any }) {
  return (
    <Stack gap={2}>
      <div className="flex justify-between text-body-sm">
        <span className="text-neutral-500">{t('customers.name', 'Name')}</span>
        <span className="font-medium text-neutral-800">{customer.name}</span>
      </div>
      <div className="flex justify-between text-body-sm">
        <span className="text-neutral-500">{t('customers.phone', 'Phone')}</span>
        <span className="font-medium text-neutral-800" dir="ltr">{customer.phone}</span>
      </div>
      {customer.email && (
        <div className="flex justify-between text-body-sm">
          <span className="text-neutral-500">{t('customers.email', 'Email')}</span>
          <span className="font-medium text-neutral-800" dir="ltr">{customer.email}</span>
        </div>
      )}
      {customer.address && (
        <div className="flex justify-between text-body-sm">
          <span className="text-neutral-500">{t('customers.address', 'Address')}</span>
          <span className="font-medium text-neutral-800">{customer.address}</span>
        </div>
      )}
    </Stack>
  );
}
