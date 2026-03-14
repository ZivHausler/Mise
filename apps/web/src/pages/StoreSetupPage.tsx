import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useCreateStore } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Logo } from '@/components/Logo';

export default function StoreSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setHasStore = useAuthStore((s) => s.setHasStore);
  const setStores = useAuthStore((s) => s.setStores);
  const setActiveStore = useAuthStore((s) => s.setActiveStore);
  const user = useAuthStore((s) => s.user);
  const pendingCreateStoreToken = useAuthStore((s) => s.pendingCreateStoreToken);
  const setPendingCreateStoreToken = useAuthStore((s) => s.setPendingCreateStoreToken);
  const addToast = useToastStore((s) => s.addToast);
  const createStore = useCreateStore();

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressEn, setAddressEn] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      createStore.mutate(
        { name, nameEn: nameEn || undefined, code: code || undefined, address: address || undefined, addressEn: addressEn || undefined, inviteToken: pendingCreateStoreToken || undefined },
        {
          onSuccess: (data: any) => {
            if (user && data.token) {
              setAuth(user, data.token, true);
              setHasStore(true);
              if (data.stores) {
                setStores(data.stores);
                if (data.stores[0]?.storeId) setActiveStore(String(data.stores[0].storeId));
              } else if (data.store) {
                const storeId = String(data.store.id);
                setStores([{ storeId, store: { id: data.store.id, name: data.store.name, code: null, theme: 'cream' }, role: 1 }]);
                setActiveStore(storeId);
              }
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
    [name, nameEn, code, address, addressEn, pendingCreateStoreToken, createStore, user, setAuth, setHasStore, setStores, setActiveStore, setPendingCreateStoreToken, navigate, addToast, t],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <Logo className="h-20 mx-auto text-[#c8a96e]" />
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
              label={`${t('store.nameEn', 'Store Name (English)')} (${t('common.optional')})`}
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t('store.nameEnPlaceholder', "e.g. Sarah's Bakery")}
              dir="ltr"
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
              placeholder={t('store.addressPlaceholder', 'e.g. בן גוריון 102, חיפה')}
              dir="auto"
            />
            <TextInput
              label={`${t('store.addressEn', 'Address (English)')} (${t('common.optional')})`}
              value={addressEn}
              onChange={(e) => setAddressEn(e.target.value)}
              placeholder={t('store.addressEnPlaceholder', 'e.g. 102 Ben Gurion St, Haifa')}
              dir="ltr"
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
