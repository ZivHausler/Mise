import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useLogin, useGoogleLogin, useAcceptInvite, useValidateInvite } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { MergeAccountDialog } from '@/components/MergeAccountDialog';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || undefined;
  const setAuth = useAuthStore((s) => s.setAuth);
  const setStores = useAuthStore((s) => s.setStores);
  const updateToken = useAuthStore((s) => s.updateToken);
  const setHasStore = useAuthStore((s) => s.setHasStore);
  const addToast = useToastStore((s) => s.addToast);
  const login = useLogin();
  const googleLogin = useGoogleLogin();
  const acceptInvite = useAcceptInvite();
  const inviteQuery = useValidateInvite(inviteToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showMerge, setShowMerge] = useState(false);
  const [showGoogleHint, setShowGoogleHint] = useState(false);
  const [mergeIdToken, setMergeIdToken] = useState<string | null>(null);

  const handleGoogleCredential = useCallback(
    (idToken: string) => {
      googleLogin.mutate(
        { idToken },
        {
          onSuccess: (data: any) => {
            setAuth(data.user, data.token, data.hasStore);
            if (data.stores) setStores(data.stores);
            navigate(data.hasStore ? '/' : '/store-setup');
          },
          onError: (error: any) => {
            const msg = error?.response?.data?.error?.message;
            if (msg === 'MERGE_REQUIRED_GOOGLE') {
              setMergeIdToken(idToken);
              setShowMerge(true);
            } else {
              addToast('error', msg || t('toasts.loginFailed'));
            }
          },
        },
      );
    },
    [googleLogin, setAuth, setStores, navigate, addToast, t],
  );

  const { renderButton, isAvailable } = useGoogleAuth(handleGoogleCredential);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAvailable && googleBtnRef.current) {
      renderButton(googleBtnRef.current);
    }
  }, [isAvailable, renderButton]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      login.mutate(
        { email, password },
        {
          onSuccess: (data: any) => {
            setAuth(data.user, data.token, data.hasStore);
            if (data.stores) setStores(data.stores);

            if (inviteToken) {
              acceptInvite.mutate(
                { token: inviteToken },
                {
                  onSuccess: (inviteData) => {
                    updateToken(inviteData.token);
                    setHasStore(true);
                    navigate('/');
                  },
                  onError: () => {
                    navigate(data.hasStore ? '/' : '/store-setup');
                  },
                },
              );
            } else {
              navigate(data.hasStore ? '/' : '/store-setup');
            }
          },
          onError: (error: any) => {
            const msg = error?.response?.data?.error?.message;
            if (msg === 'MERGE_REQUIRED_EMAIL') {
              setShowGoogleHint(true);
            } else {
              addToast('error', t('toasts.loginFailed'));
            }
          },
        },
      );
    },
    [email, password, inviteToken, login, acceptInvite, setAuth, setStores, updateToken, setHasStore, navigate, addToast, t],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-display text-primary-700">Mise</h1>
          <p className="mt-2 text-body-sm text-neutral-500">{t('app.tagline')}</p>
        </div>

        {inviteToken && inviteQuery.data && (
          <div className="mb-6 rounded-md bg-primary-50 border border-primary-200 p-4 text-center">
            <p className="text-body-sm text-primary-700">
              {t('store.invitedTo', "You've been invited to join")}
            </p>
            <p className="font-semibold text-primary-800 mt-1">{inviteQuery.data.storeName}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Stack gap={4}>
            <TextInput
              label={t('auth.email')}
              type="email"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="baker@mise.app"
            />
            <TextInput
              label={t('auth.password')}
              type="password"
              dir="ltr"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="primary" fullWidth loading={login.isPending}>
              {t('auth.login')}
            </Button>
          </Stack>
        </form>

        <p className="mt-6 text-center text-body-sm text-neutral-500">
          {t('auth.noAccount', "Don't have an account?")}{' '}
          <Link to={inviteToken ? `/register?invite=${inviteToken}` : '/register'} className="text-primary-500 hover:underline">
            {t('auth.register')}
          </Link>
        </p>

        {isAvailable && (
          <>
            <div className="mt-8 mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-200" />
              <span className="text-body-sm text-neutral-400">{t('auth.orContinueWith')}</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>
            <div ref={googleBtnRef} className="flex justify-center overflow-hidden" />
          </>
        )}
      </div>

      {showMerge && (
        <MergeAccountDialog
          idToken={mergeIdToken}
          onSuccess={() => {
            setShowMerge(false);
            navigate('/');
          }}
          onClose={() => setShowMerge(false)}
        />
      )}

      {showGoogleHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowGoogleHint(false)}>
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold text-neutral-800">{t('auth.googleHintTitle')}</h2>
            <p className="mb-4 text-body-sm text-neutral-500">{t('auth.googleHintMessage')}</p>
            <Button variant="primary" fullWidth onClick={() => setShowGoogleHint(false)}>
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
