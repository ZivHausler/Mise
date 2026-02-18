import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Mail, Copy, Check, Link as LinkIcon, Clock } from 'lucide-react';
import { Card, Section, Stack } from '@/components/Layout';
import { TextInput, Select } from '@/components/FormFields';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useStoreMembers, useSendInvite, usePendingInvitations } from '@/api/hooks';
import { INVITE_ROLE_OPTIONS, ROLE_LABELS } from '@/constants/defaults';

export default function TeamTab() {
  const { t } = useTranslation();
  const { data: members, isLoading } = useStoreMembers();
  const { data: pendingInvitations } = usePendingInvitations();
  const sendInvite = useSendInvite();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('3');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPendingEmail, setCopiedPendingEmail] = useState<string | null>(null);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    sendInvite.mutate(
      { email: inviteEmail, role: Number(inviteRole) },
      {
        onSuccess: (data) => {
          setGeneratedLink(data.inviteLink);
        },
      },
    );
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPendingLink = async (email: string, link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedPendingEmail(email);
    setTimeout(() => setCopiedPendingEmail(null), 2000);
  };

  const handleNewInvite = () => {
    setGeneratedLink(null);
    setInviteEmail('');
    setInviteRole('3');
    setCopied(false);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const memberList = (members as Array<{ userId: string; name: string; email: string; role: number }>) ?? [];
  const pendingList = (pendingInvitations as Array<{ email: string; role: number; inviteLink: string; createdAt: string; expiresAt: string }>) ?? [];

  return (
    <Stack gap={6}>
      <Card>
        <Section title={t('settings.team.title')}>
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

            {pendingList.map((inv) => (
              <div key={inv.email} className="flex items-center justify-between rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-body-sm font-medium text-neutral-600">{inv.email}</p>
                    <p className="text-body-sm text-neutral-400">
                      {t(`settings.team.role${inv.role}`, ROLE_LABELS[inv.role] || 'Member')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPendingLink(inv.email, inv.inviteLink)}
                    className="rounded p-1.5 text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                    title={t('settings.team.copyLink')}
                  >
                    {copiedPendingEmail === inv.email ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-body-sm font-medium text-amber-700">
                    {t('settings.team.pending')}
                  </span>
                </div>
              </div>
            ))}

            {memberList.length === 0 && pendingList.length === 0 && (
              <p className="text-body-sm text-neutral-500">{t('settings.team.noMembers')}</p>
            )}
          </div>
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.team.invite')}>
          {generatedLink ? (
            <Stack gap={3}>
              <div className="flex items-center gap-2 text-primary-700">
                <LinkIcon className="h-4 w-4" />
                <p className="text-body-sm font-medium">{t('settings.team.linkGenerated')}</p>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                <input
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-transparent text-body-sm text-neutral-700 outline-none"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <Button variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={handleNewInvite}>
                {t('settings.team.inviteAnother')}
              </Button>
            </Stack>
          ) : !showInviteForm ? (
            <Button variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowInviteForm(true)}>
              {t('settings.team.inviteMember')}
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
                  label={t('settings.team.roleLabel')}
                  options={INVITE_ROLE_OPTIONS.map((r) => ({ ...r, label: t(`settings.team.role${r.value}`, r.label) }))}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" icon={<Mail className="h-4 w-4" />} loading={sendInvite.isPending}>
                    {t('settings.team.sendInvite')}
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
