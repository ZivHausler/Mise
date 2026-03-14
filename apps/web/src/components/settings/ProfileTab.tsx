import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Section, Stack } from '@/components/Layout';
import { TextInput } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { useProfile, useUpdateProfile } from '@/api/hooks';
import { ENUM_TO_LANGUAGE } from '@/constants/defaults';
import { languageDir } from '@/utils/language';

export default function ProfileTab() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const authUser = useAuthStore((s) => s.user);
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const initLanguageFromProfile = useAppStore((s) => s.initLanguageFromProfile);

  const p = profile as { id: number; email: string; name: string; phone?: string; language: number } | undefined;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (p) {
      setName(p.name);
      setPhone(p.phone || '');
      setDirty(false);
      // Initialize language from DB profile
      const lang = ENUM_TO_LANGUAGE[p.language] ?? 'he';
      i18n.changeLanguage(lang);
      initLanguageFromProfile(p.language);
      document.documentElement.dir = languageDir(lang);
      document.documentElement.lang = lang;
    }
  }, [p, i18n, initLanguageFromProfile]);

  const validatePhone = (value: string): boolean => {
    if (!value) return true;
    if (!/^05\d{8}$/.test(value)) {
      setPhoneError(t('settings.account.phoneError', 'Invalid phone number — e.g. 0541234567'));
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSave = () => {
    if (!validatePhone(phone)) return;
    const payload: Record<string, unknown> = {};
    if (name !== p?.name) payload.name = name;
    if (phone !== (p?.phone || '')) payload.phone = phone || null;
    if (Object.keys(payload).length > 0) {
      updateProfile.mutate(payload, { onSuccess: () => setDirty(false) });
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setDirty(true);
  };

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={6}>
      <Card>
        <Section title={t('settings.profile', 'Profile')}>
          <Stack gap={3}>
            <TextInput label={t('auth.email')} value={p?.email ?? authUser?.email ?? ''} disabled />
            <TextInput label={t('auth.name')} value={name} onChange={handleFieldChange(setName)} />
            <TextInput label={t('settings.account.phone', 'Phone')} value={phone} onChange={(e) => { handleFieldChange(setPhone)(e); setPhoneError(''); }} error={phoneError} dir="ltr" />
            {dirty && (
              <div className="flex justify-center pt-3">
                <Button variant="primary" size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSave} loading={updateProfile.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            )}
          </Stack>
        </Section>
      </Card>

      {/* Mobile-only logout button (sidebar has logout on desktop) */}
      <div className="lg:hidden">
        <Card>
          <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
            {t('auth.logout')}
          </Button>
        </Card>
      </div>
    </Stack>
  );
}
