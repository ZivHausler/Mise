import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Mail } from 'lucide-react';
import { Card, Section, Stack } from '@/components/Layout';
import { TextInput, Select } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useStoreMembers, useSendInvite } from '@/api/hooks';

const ROLE_OPTIONS = [
  { value: '2', label: 'Manager' },
  { value: '3', label: 'Employee' },
];

const ROLE_LABELS: Record<number, string> = {
  1: 'Owner',
  2: 'Manager',
  3: 'Employee',
};

export default function TeamTab() {
  const { t } = useTranslation();
  const { data: members, isLoading } = useStoreMembers();
  const sendInvite = useSendInvite();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('3');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    sendInvite.mutate(
      { email: inviteEmail, role: Number(inviteRole) },
      {
        onSuccess: () => {
          setInviteEmail('');
          setInviteRole('3');
          setShowInviteForm(false);
        },
      },
    );
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const memberList = (members as Array<{ userId: string; name: string; email: string; role: number }>) ?? [];

  return (
    <Stack gap={6}>
      <Card>
        <Section title={t('settings.team.title', 'Team Members')}>
          <div className="space-y-3">
            {memberList.map((m) => (
              <div key={m.userId} className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3">
                <div>
                  <p className="text-body-sm font-medium text-neutral-800">{m.name}</p>
                  <p className="text-body-sm text-neutral-500">{m.email}</p>
                </div>
                <span className="rounded-full bg-primary-100 px-3 py-1 text-body-sm font-medium text-primary-700">
                  {t(`settings.team.role${m.role}`, ROLE_LABELS[m.role] || 'Member')}
                </span>
              </div>
            ))}
            {memberList.length === 0 && (
              <p className="text-body-sm text-neutral-500">{t('settings.team.noMembers', 'No team members yet.')}</p>
            )}
          </div>
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.team.invite', 'Invite')}>
          {!showInviteForm ? (
            <Button variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowInviteForm(true)}>
              {t('settings.team.inviteMember', 'Invite Member')}
            </Button>
          ) : (
            <form onSubmit={handleInvite}>
              <Stack gap={3}>
                <TextInput
                  label={t('auth.email')}
                  type="email"
                  dir="ltr"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="team@example.com"
                />
                <Select
                  label={t('settings.team.roleLabel', 'Role')}
                  options={ROLE_OPTIONS.map((r) => ({ ...r, label: t(`settings.team.role${r.value}`, r.label) }))}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" icon={<Mail className="h-4 w-4" />} loading={sendInvite.isPending}>
                    {t('settings.team.sendInvite', 'Send Invite')}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowInviteForm(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </Stack>
            </form>
          )}
        </Section>
      </Card>
    </Stack>
  );
}
