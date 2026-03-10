import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useForgotPassword } from '@/api/hooks';
import { useToastStore } from '@/store/toast';
import { Logo } from '@/components/Logo';
import { getApiErrorCode } from '@/utils/getApiError';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const forgotPassword = useForgotPassword();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      forgotPassword.mutate(
        { email },
        {
          onSuccess: () => setSent(true),
          onError: () => {
            addToast('error', t('toasts.somethingWentWrong'));
          },
        },
      );
    },
    [email, forgotPassword, addToast, t],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <Logo className="h-20 mx-auto text-[#c8a96e]" />
        </div>

        {sent ? (
          <Stack gap={4}>
            <div className="flex justify-center">
              <Mail className="h-12 w-12 text-primary-500" />
            </div>
            <h1 className="text-center text-heading-md font-semibold text-neutral-800">
              {t('auth.checkYourEmail')}
            </h1>
            <p className="text-center text-body-sm text-neutral-500">
              {t('auth.resetEmailSent')}
            </p>
            <div className="rounded-md bg-primary-50 border border-primary-200 p-4 text-center">
              <p className="text-body-sm text-primary-700">
                {t('auth.didntReceive')}
              </p>
            </div>
            <Link to="/login">
              <Button variant="primary" fullWidth>
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </Stack>
        ) : (
          <>
            <h1 className="mb-2 text-center text-heading-md font-semibold text-neutral-800">
              {t('auth.forgotPasswordTitle')}
            </h1>
            <p className="mb-6 text-center text-body-sm text-neutral-500">
              {t('auth.forgotPasswordDescription')}
            </p>
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
                <Button type="submit" variant="primary" fullWidth loading={forgotPassword.isPending}>
                  {t('auth.sendResetLink')}
                </Button>
              </Stack>
            </form>
            <p className="mt-6 text-center text-body-sm text-neutral-500">
              <Link to="/login" className="text-primary-500 hover:underline">
                {t('auth.backToLogin')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
