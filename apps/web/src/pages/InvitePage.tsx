import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { Stack } from '@/components/Layout';
import { useValidateInvite, useAcceptInvite } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateToken = useAuthStore((s) => s.updateToken);
  const setHasStore = useAuthStore((s) => s.setHasStore);
  const setPendingCreateStoreToken = useAuthStore((s) => s.setPendingCreateStoreToken);
  const acceptInvite = useAcceptInvite();

  const { data: invite, isLoading, isError } = useValidateInvite(token);

  const isCreateStoreInvite = invite?.type === 'create_store';

  const handleJoin = () => {
    if (!token) return;
    acceptInvite.mutate(
      { token },
      {
        onSuccess: (data) => {
          updateToken(data.token);
          setHasStore(true);
          navigate('/');
        },
      },
    );
  };

  const handleSetupStore = () => {
    if (!token) return;
    setPendingCreateStoreToken(token);
    navigate('/store-setup');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50">
        <Spinner />
      </div>
    );
  }

  if (isError || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
          <h1 className="font-heading text-display text-primary-700 mb-4">Mise</h1>
          <p className="text-body-sm text-neutral-600">{t('store.invalidInvite', 'This invite link is invalid or has expired.')}</p>
          <Link to="/login" className="mt-4 inline-block text-primary-500 hover:underline text-body-sm">
            {t('auth.login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-display text-primary-700">Mise</h1>
        </div>

        <div className="mb-6 rounded-md bg-primary-50 border border-primary-200 p-4 text-center">
          <p className="text-body-sm text-primary-700">
            {isCreateStoreInvite
              ? t('store.invitedToCreate', "You've been invited to create your own store")
              : t('store.invitedTo', "You've been invited to join")}
          </p>
          {!isCreateStoreInvite && invite.storeName && (
            <p className="font-semibold text-primary-800 mt-1">{invite.storeName}</p>
          )}
        </div>

        {isAuthenticated ? (
          <Stack gap={3}>
            {isCreateStoreInvite ? (
              <Button variant="primary" fullWidth onClick={handleSetupStore}>
                {t('store.setupStore', 'Set Up Store')}
              </Button>
            ) : (
              <Button variant="primary" fullWidth onClick={handleJoin} loading={acceptInvite.isPending}>
                {t('store.joinStore', 'Join Store')}
              </Button>
            )}
          </Stack>
        ) : (
          <Stack gap={3}>
            <Link to={`/login/${token}`}>
              <Button variant="primary" fullWidth>
                {t('auth.login')}
              </Button>
            </Link>
            <Link to={`/register/${token}`}>
              <Button variant="secondary" fullWidth>
                {t('auth.register')}
              </Button>
            </Link>
          </Stack>
        )}
      </div>
    </div>
  );
}
