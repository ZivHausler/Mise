import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useRegister, useGoogleRegister, useValidateInvite, useAcceptInvite } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { inviteToken } = useParams<{ inviteToken: string }>();

  const setAuth = useAuthStore((s) => s.setAuth);
  const setStores = useAuthStore((s) => s.setStores);
  const updateToken = useAuthStore((s) => s.updateToken);
  const setHasStore = useAuthStore((s) => s.setHasStore);
  const setPendingCreateStoreToken = useAuthStore((s) => s.setPendingCreateStoreToken);
  const addToast = useToastStore((s) => s.addToast);
  const register = useRegister();
  const googleRegister = useGoogleRegister();
  const acceptInvite = useAcceptInvite();
  const inviteQuery = useValidateInvite(inviteToken);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const passwordRules = useMemo(() => [
    { key: 'minLength', test: (p: string) => p.length >= 8 },
    { key: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
    { key: 'number', test: (p: string) => /[0-9]/.test(p) },
  ], []);
  const isPasswordValid = password.length === 0 || passwordRules.every((r) => r.test(password));

  // Redirect to /login if no invite token
  useEffect(() => {
    if (!inviteToken) {
      navigate('/login', { replace: true });
    }
  }, [inviteToken, navigate]);

  // Pre-fill email from invite
  useEffect(() => {
    if (inviteQuery.data?.email && !email) {
      setEmail(inviteQuery.data.email);
    }
  }, [inviteQuery.data?.email, email]);

  const isCreateStoreInvite = inviteQuery.data?.type === 'create_store';

  const handleGoogleCredential = useCallback(
    (idToken: string) => {
      googleRegister.mutate(
        { idToken, inviteToken },
        {
          onSuccess: (data: any) => {
            setAuth(data.user, data.token, data.hasStore, data.user?.isAdmin);
            if (data.stores) setStores(data.stores);

            if (data.pendingCreateStoreToken) {
              setPendingCreateStoreToken(data.pendingCreateStoreToken);
              navigate('/store-setup');
            } else {
              navigate(data.hasStore ? '/' : '/store-setup');
            }
          },
          onError: (error: any) => {
            const msg = error?.response?.data?.error?.message;
            addToast('error', msg || t('toasts.registrationFailed'));
          },
        },
      );
    },
    [googleRegister, inviteToken, setAuth, setStores, setPendingCreateStoreToken, navigate, addToast, t],
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
      if (!passwordRules.every((r) => r.test(password))) return;
      register.mutate(
        { name, email, password, inviteToken },
        {
          onSuccess: (data: any) => {
            setAuth(data.user, data.token, data.hasStore, data.user?.isAdmin);
            if (data.stores) setStores(data.stores);

            if (data.pendingCreateStoreToken) {
              setPendingCreateStoreToken(data.pendingCreateStoreToken);
              navigate('/store-setup');
            } else {
              navigate(data.hasStore ? '/' : '/store-setup');
            }
          },
          onError: (error: any) => {
            const msg = error?.response?.data?.error?.message;
            if (msg === 'ACCOUNT_EXISTS_GOOGLE') {
              addToast('error', t('auth.accountExistsGoogle'));
            } else {
              addToast('error', t('toasts.registrationFailed'));
            }
          },
        }
      );
    },
    [name, email, password, inviteToken, register, setAuth, setStores, setPendingCreateStoreToken, navigate, addToast, t, passwordRules]
  );

  if (!inviteToken) return null;

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
              {isCreateStoreInvite
                ? t('store.invitedToCreate', "You've been invited to create your own store")
                : t('store.invitedTo', "You've been invited to join")}
            </p>
            {!isCreateStoreInvite && inviteQuery.data.storeName && (
              <p className="font-semibold text-primary-800 mt-1">{inviteQuery.data.storeName}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Stack gap={4}>
            <TextInput
              label={t('auth.name')}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              dir="auto"
            />
            <TextInput
              label={t('auth.email')}
              type="email"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="baker@mise.app"
            />
            <div>
              <TextInput
                label={t('auth.password')}
                type="password"
                dir="ltr"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <li key={rule.key} className={`flex items-center gap-1.5 text-caption ${passed ? 'text-success' : 'text-neutral-400'}`}>
                        {passed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {t(`auth.passwordRules.${rule.key}`)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <Button type="submit" variant="primary" fullWidth loading={register.isPending} disabled={!isPasswordValid}>
              {t('auth.register')}
            </Button>
          </Stack>
        </form>

        <p className="mt-6 text-center text-body-sm text-neutral-500">
          {t('auth.hasAccount', 'Already have an account?')}{' '}
          <Link to={inviteToken ? `/login/${inviteToken}` : '/login'} className="text-primary-500 hover:underline">
            {t('auth.login')}
          </Link>
        </p>

        {isAvailable && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-200" />
              <span className="text-body-sm text-neutral-400">{t('auth.orContinueWith')}</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>
            <div ref={googleBtnRef} className="flex justify-center overflow-hidden" />
          </>
        )}
      </div>
    </div>
  );
}
