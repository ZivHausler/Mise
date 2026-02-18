import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useCreateStore } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';

export default function StoreSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setHasStore = useAuthStore((s) => s.setHasStore);
  const setStores = useAuthStore((s) => s.setStores);
  const user = useAuthStore((s) => s.user);
  const pendingCreateStoreToken = useAuthStore((s) => s.pendingCreateStoreToken);
  const setPendingCreateStoreToken = useAuthStore((s) => s.setPendingCreateStoreToken);
  const addToast = useToastStore((s) => s.addToast);
  const createStore = useCreateStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      createStore.mutate(
        { name, code: code || undefined, address: address || undefined, inviteToken: pendingCreateStoreToken || undefined },
        {
          onSuccess: (data: any) => {
            if (user && data.token) {
              setAuth(user, data.token, true);
              setHasStore(true);
              if (data.stores) setStores(data.stores);
              else if (data.store) setStores([{ storeId: data.store.id, storeName: data.store.name, role: 1 }]);
            }
            setPendingCreateStoreToken(null);
            navigate('/');
          },
          onError: () => {
            addToast('error', t('store.createFailed', 'Failed to create store'));
          },
        },
      );
    },
    [name, code, address, pendingCreateStoreToken, createStore, user, setAuth, setHasStore, setStores, setPendingCreateStoreToken, navigate, addToast, t],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-display text-primary-700">Mise</h1>
          <p className="mt-2 text-body-sm text-neutral-500">
            {t('store.setupTitle', 'Set up your bakery')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Stack gap={4}>
            <TextInput
              label={t('store.name', 'Store Name')}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('store.namePlaceholder', "e.g. Sarah's Bakery")}
              dir="auto"
            />
            <TextInput
              label={t('store.code', 'Store Code')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('store.codePlaceholder', 'e.g. SARAH-BKR')}
              dir="ltr"
            />
            <TextInput
              label={t('store.address', 'Address')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              dir="auto"
            />
            <Button type="submit" variant="primary" fullWidth loading={createStore.isPending}>
              {t('store.create', 'Create Store')}
            </Button>
          </Stack>
        </form>
      </div>
    </div>
  );
}
