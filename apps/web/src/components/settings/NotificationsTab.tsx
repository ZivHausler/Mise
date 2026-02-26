import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Section } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useNotificationPreferences, useUpdateNotificationPreferences, useProfile, useWhatsAppConfig, useFeatureFlags } from '@/api/hooks';
import { useAppStore } from '@/store/app';
import { Save, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const PUSH_NOTIFICATIONS_STORE_IDS = (import.meta.env.VITE_PUSH_NOTIFICATIONS_STORE_IDS ?? '').split(',').filter(Boolean);
import { NOTIFICATION_EVENTS } from '@/constants/defaults';

interface PrefRow {
  eventType: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export default function NotificationsTab() {
  const { t } = useTranslation();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const { data: profile } = useProfile();
  const updatePrefs = useUpdateNotificationPreferences();
  const { data: whatsappConfig } = useWhatsAppConfig();
  const { data: featureFlags } = useFeatureFlags();
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);

  const activeStoreId = useAuthStore((s) => s.activeStoreId);

  const p = profile as { phone?: string } | undefined;
  const hasPhone = !!featureFlags?.sms && !!p?.phone;
  const hasWhatsApp = !!whatsappConfig?.connected;
  const hasPush = !!activeStoreId && PUSH_NOTIFICATIONS_STORE_IDS.includes(activeStoreId);

  const [rows, setRows] = useState<PrefRow[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const existing = (prefs ?? []) as { eventType: string; channelEmail: boolean; channelPush: boolean; channelSms: boolean; channelWhatsapp: boolean }[];
    const mapped = NOTIFICATION_EVENTS.map((et) => {
      const found = existing.find((e) => e.eventType === et);
      return {
        eventType: et,
        email: found?.channelEmail ?? true,
        push: found?.channelPush ?? false,
        sms: found?.channelSms ?? false,
        whatsapp: found?.channelWhatsapp ?? false,
      };
    });
    setRows(mapped);
    setDirty(false);
  }, [prefs]);

  const toggle = (eventType: string, channel: 'email' | 'push' | 'sms' | 'whatsapp') => {
    setRows((prev) => prev.map((r) => r.eventType === eventType ? { ...r, [channel]: !r[channel] } : r));
    setDirty(true);
  };

  const handleSave = () => {
    updatePrefs.mutate({ preferences: rows }, { onSuccess: () => setDirty(false) });
  };

  const eventLabel = (et: string) => {
    const labels: Record<string, string> = {
      order_created: t('settings.notifications.orderCreated', 'Order Created'),
      low_stock: t('settings.notifications.lowStock', 'Low Stock Alert'),
      payment_received: t('settings.notifications.paymentReceived', 'Payment Received'),
    };
    return labels[et] || et;
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Card>
      <Section title={t('settings.notifications.title', 'Notification Preferences')}>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th className="sticky start-0 z-10 bg-neutral-50 px-3 py-2 text-start font-semibold">{t('settings.notifications.event', 'Event')}</th>
                <th className="px-3 py-2 text-center font-semibold">{t('settings.notifications.email', 'Email')}</th>
                <th className="px-3 py-2 text-center font-semibold">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={hasPush ? '' : 'text-neutral-400'}>{t('settings.notifications.app', 'App')}</span>
                    {!hasPush && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-500">
                        <Sparkles className="h-3 w-3" />
                        {t('nav.comingSoon', 'Coming soon')}
                      </span>
                    )}
                  </div>
                </th>
                {hasPhone && (
                  <th className="px-3 py-2 text-center font-semibold">
                    {t('settings.notifications.sms', 'SMS')}
                  </th>
                )}
                {hasWhatsApp && (
                  <th className="px-3 py-2 text-center font-semibold">
                    {t('settings.notifications.whatsapp', 'WhatsApp')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.eventType} className="border-b border-neutral-100">
                  <td className="sticky start-0 z-10 bg-white px-3 py-3 font-medium text-neutral-700">{eventLabel(row.eventType)}</td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.email}
                      onChange={() => toggle(row.eventType, 'email')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={hasPush && row.push}
                      onChange={() => toggle(row.eventType, 'push')}
                      disabled={!hasPush}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </td>
                  {hasPhone && (
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.sms}
                        onChange={() => toggle(row.eventType, 'sms')}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {hasWhatsApp && (
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.whatsapp}
                        onChange={() => toggle(row.eventType, 'whatsapp')}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!hasPhone || !hasWhatsApp) && (
          <ul className="mt-3 space-y-1 text-caption text-neutral-400">
            {!hasPhone && (
              <li className="flex items-start gap-1.5">
                <span>&#8226;</span>
                <span>
                  {t('settings.notifications.phoneHintPrefix', 'Add a phone number in the')}{' '}
                  <button type="button" onClick={() => setSettingsTab('account')} className="underline hover:text-neutral-600">
                    {t('settings.notifications.phoneHintLink', 'Account tab')}
                  </button>{' '}
                  {t('settings.notifications.phoneHintSuffix', 'to enable SMS notifications.')}
                </span>
              </li>
            )}
            {!hasWhatsApp && (
              <li className="flex items-start gap-1.5">
                <span>&#8226;</span>
                <span>
                  {t('settings.notifications.whatsappHintPrefix', 'Connect WhatsApp in the')}{' '}
                  <button type="button" onClick={() => setSettingsTab('integrations')} className="underline hover:text-neutral-600">
                    {t('settings.notifications.whatsappHintLink', 'Integrations tab')}
                  </button>{' '}
                  {t('settings.notifications.whatsappHintSuffix', 'to enable WhatsApp notifications.')}
                </span>
              </li>
            )}
          </ul>
        )}
        {dirty && (
          <div className="mt-4 flex justify-center">
            <Button variant="primary" size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSave} loading={updatePrefs.isPending}>
              {t('common.save')}
            </Button>
          </div>
        )}
      </Section>
    </Card>
  );
}
