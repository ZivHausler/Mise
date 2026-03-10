import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/FormFields';
import { Stack } from '@/components/Layout';
import { useResetPassword } from '@/api/hooks';
import { Logo } from '@/components/Logo';
import { getApiErrorCode } from '@/utils/getApiError';

type PageState = 'form' | 'success' | 'expired';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const resetPassword = useResetPassword();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pageState, setPageState] = useState<PageState>('form');

  const passwordRules = useMemo(() => [
    { key: 'minLength', test: (p: string) => p.length >= 8 },
    { key: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
    { key: 'number', test: (p: string) => /[0-9]/.test(p) },
  ], []);

  const allRulesPassed = passwordRules.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = allRulesPassed && passwordsMatch && confirmPassword.length > 0;

  // Auto-redirect after success
  useEffect(() => {
    if (pageState === 'success') {
      const timer = setTimeout(() => navigate('/login', { replace: true }), 3000);
      return () => clearTimeout(timer);
    }
  }, [pageState, navigate]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || !token) return;
      resetPassword.mutate(
        { token, newPassword },
        {
          onSuccess: () => setPageState('success'),
          onError: (error: any) => {
            const code = getApiErrorCode(error);
            if (code === 'AUTH_RESET_TOKEN_INVALID') {
              setPageState('expired');
            } else {
              setPageState('expired');
            }
          },
        },
      );
    },
    [canSubmit, token, newPassword, resetPassword],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <Logo className="h-20 mx-auto text-[#c8a96e]" />
        </div>

        {pageState === 'success' && (
          <Stack gap={4}>
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <h1 className="text-center text-heading-md font-semibold text-neutral-800">
              {t('auth.passwordResetSuccess')}
            </h1>
            <p className="text-center text-body-sm text-neutral-500">
              {t('auth.passwordUpdated')}
            </p>
            <p className="text-center text-body-sm text-neutral-400">
              {t('auth.redirectingToLogin')}
            </p>
            <Link to="/login">
              <Button variant="primary" fullWidth>
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </Stack>
        )}

        {pageState === 'expired' && (
          <Stack gap={4}>
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-warning" />
            </div>
            <h1 className="text-center text-heading-md font-semibold text-neutral-800">
              {t('auth.linkExpired')}
            </h1>
            <p className="text-center text-body-sm text-neutral-500">
              {t('auth.linkExpiredDescription')}
            </p>
            <Link to="/forgot-password">
              <Button variant="primary" fullWidth>
                {t('auth.requestNewLink')}
              </Button>
            </Link>
          </Stack>
        )}

        {pageState === 'form' && (
          <>
            <h1 className="mb-6 text-center text-heading-md font-semibold text-neutral-800">
              {t('auth.setNewPassword')}
            </h1>
            <form onSubmit={handleSubmit}>
              <Stack gap={4}>
                <div>
                  <TextInput
                    label={t('auth.newPassword')}
                    type="password"
                    dir="ltr"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  {newPassword.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {passwordRules.map((rule) => {
                        const passed = rule.test(newPassword);
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
                <div>
                  <TextInput
                    label={t('auth.confirmPassword')}
                    type="password"
                    dir="ltr"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="mt-1 text-caption text-error">
                      {t('auth.passwordMismatch')}
                    </p>
                  )}
                </div>
                <Button type="submit" variant="primary" fullWidth loading={resetPassword.isPending} disabled={!canSubmit}>
                  {t('auth.resetPassword')}
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
