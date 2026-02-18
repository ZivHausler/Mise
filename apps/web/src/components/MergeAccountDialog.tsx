import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useMergeGoogleToEmail } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';

interface MergeAccountDialogProps {
  idToken: string | null;
  onSuccess: (data: { user: any; token: string; hasStore: boolean; stores?: any[] }) => void;
  onClose: () => void;
}

export function MergeAccountDialog({ idToken, onSuccess, onClose }: MergeAccountDialogProps) {
  const { t } = useTranslation();
  const mergeGoogleToEmail = useMergeGoogleToEmail();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!idToken) return;
      setError('');
      mergeGoogleToEmail.mutate(
        { idToken, password },
        {
          onSuccess: (data: any) => {
            onSuccess(data);
          },
          onError: () => {
            setError(t('auth.incorrectPassword'));
          },
        },
      );
    },
    [idToken, password, mergeGoogleToEmail, onSuccess, t],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold text-neutral-800">{t('auth.mergeTitle')}</h2>
        <p className="mb-4 text-body-sm text-neutral-500">{t('auth.mergeGoogleToEmail')}</p>
        <form onSubmit={handleSubmit}>
          <Stack gap={4}>
            <div>
              <TextInput
                label={t('auth.password')}
                type="password"
                dir="ltr"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" fullWidth onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={mergeGoogleToEmail.isPending}
              >
                {t('auth.linkAccounts')}
              </Button>
            </div>
          </Stack>
        </form>
      </div>
    </div>
  );
}
