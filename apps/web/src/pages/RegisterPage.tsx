import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useRegister, useGoogleLogin } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);
  const register = useRegister();
  const googleLogin = useGoogleLogin();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleCredential = useCallback(
    (idToken: string) => {
      googleLogin.mutate(
        { idToken },
        {
          onSuccess: (data: any) => {
            setAuth(data.user, data.token);
            navigate('/');
          },
          onError: (error: any) => {
            const msg = error?.response?.data?.error?.message;
            addToast('error', msg || t('toasts.loginFailed'));
          },
        },
      );
    },
    [googleLogin, setAuth, navigate, addToast, t],
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
      register.mutate(
        { name, email, password },
        {
          onSuccess: (data: any) => {
            setAuth(data.user, data.token);
            navigate('/');
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
    [name, email, password, register, setAuth, navigate, addToast, t]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-display text-primary-700">Mise</h1>
          <p className="mt-2 text-body-sm text-neutral-500">{t('app.tagline')}</p>
        </div>

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
            <TextInput
              label={t('auth.password')}
              type="password"
              dir="ltr"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
            <Button type="submit" variant="primary" fullWidth loading={register.isPending}>
              {t('auth.register')}
            </Button>
          </Stack>
        </form>

        <p className="mt-6 text-center text-body-sm text-neutral-500">
          {t('auth.hasAccount', 'Already have an account?')}{' '}
          <Link to="/login" className="text-primary-500 hover:underline">
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
