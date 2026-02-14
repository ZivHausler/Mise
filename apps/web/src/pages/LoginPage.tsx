import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useLogin } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      login.mutate(
        { email, password },
        {
          onSuccess: (data: any) => {
            setAuth(data.user, data.token);
            navigate('/');
          },
        }
      );
    },
    [email, password, login, setAuth, navigate]
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
          <Link to="/register" className="text-primary-500 hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
