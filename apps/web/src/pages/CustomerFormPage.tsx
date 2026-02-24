import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page, Card, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TextInput, TextArea } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { PageSkeleton } from '@/components/Feedback';
import { useCustomer, useUpdateCustomer } from '@/api/hooks';

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const numId = id ? Number(id) : 0;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(numId);
  const updateCustomer = useUpdateCustomer();

  const c = customer as any;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!c) return;
    setName(c.name ?? '');
    setPhone(c.phone ?? '');
    setEmail(c.email ?? '');
    setAddress(c.address ?? '');
    setNotes(c.notes ?? '');
  }, [c]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateCustomer.mutate(
        { id: numId, name, phone, email: email || undefined, address: address || undefined, notes: notes || undefined },
        { onSuccess: () => navigate(`/customers/${numId}`) },
      );
    },
    [numId, name, phone, email, address, notes, updateCustomer, navigate],
  );

  if (isLoading) return <PageSkeleton />;
  if (!c) return null;

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: t('nav.customers'), path: '/customers' },
          { label: c.name, path: `/customers/${numId}` },
          { label: t('common.edit') },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Stack gap={6}>
          <Card>
            <Stack gap={4}>
              <TextInput label={t('customers.name', 'Name')} value={name} onChange={(e) => setName(e.target.value)} required dir="auto" />
              <TextInput label={t('customers.phone', 'Phone')} value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" type="tel" />
              <TextInput label={t('customers.email', 'Email')} value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" type="email" />
              <TextArea label={t('customers.address', 'Address')} value={address} onChange={(e) => setAddress(e.target.value)} dir="auto" />
              <TextArea label={t('customers.notes', 'Notes')} value={notes} onChange={(e) => setNotes(e.target.value)} dir="auto" />
            </Stack>
          </Card>

          <Row gap={2} className="justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={updateCustomer.isPending}>
              {t('common.save')}
            </Button>
          </Row>
        </Stack>
      </form>
    </Page>
  );
}
