import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Section } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useNotificationPreferences, useUpdateNotificationPreferences, useProfile } from '@/api/hooks';
import { Save } from 'lucide-react';

const EVENT_TYPES = ['order_created', 'order_status_changed', 'low_stock', 'payment_received'] as const;

interface PrefRow {
  eventType: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export default function NotificationsTab() {
  const { t } = useTranslation();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const { data: profile } = useProfile();
  const updatePrefs = useUpdateNotificationPreferences();

  const p = profile as { phone?: string } | undefined;
  const hasPhone = !!p?.phone;

  const [rows, setRows] = useState<PrefRow[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const existing = (prefs ?? []) as { eventType: string; channelEmail: boolean; channelPush: boolean; channelSms: boolean }[];
    const mapped = EVENT_TYPES.map((et) => {
      const found = existing.find((e) => e.eventType === et);
      return {
        eventType: et,
        email: found?.channelEmail ?? true,
        push: found?.channelPush ?? false,
        sms: found?.channelSms ?? false,
      };
    });
    setRows(mapped);
    setDirty(false);
  }, [prefs]);

  const toggle = (eventType: string, channel: 'email' | 'push' | 'sms') => {
    setRows((prev) => prev.map((r) => r.eventType === eventType ? { ...r, [channel]: !r[channel] } : r));
    setDirty(true);
  };

  const handleSave = () => {
    updatePrefs.mutate({ preferences: rows }, { onSuccess: () => setDirty(false) });
  };

  const eventLabel = (et: string) => {
    const labels: Record<string, string> = {
      order_created: t('settings.notifications.orderCreated', 'Order Created'),
      order_status_changed: t('settings.notifications.orderStatusChanged', 'Order Status Changed'),
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
                <th className="px-3 py-2 text-start font-semibold">{t('settings.notifications.event', 'Event')}</th>
                <th className="px-3 py-2 text-center font-semibold">{t('settings.notifications.email', 'Email')}</th>
                <th className="px-3 py-2 text-center font-semibold">
                  <span className="text-neutral-400">{t('settings.notifications.app', 'App')}</span>
                </th>
                <th className="px-3 py-2 text-center font-semibold">
                  {t('settings.notifications.sms', 'SMS')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.eventType} className="border-b border-neutral-100">
                  <td className="px-3 py-3 font-medium text-neutral-700">{eventLabel(row.eventType)}</td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.email}
                      onChange={() => toggle(row.eventType, 'email')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-block rounded bg-neutral-100 px-2 py-0.5 text-caption text-neutral-400">
                      {t('settings.notifications.comingSoon', 'Coming Soon')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {hasPhone ? (
                      <input
                        type="checkbox"
                        checked={row.sms}
                        onChange={() => toggle(row.eventType, 'sms')}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                      />
                    ) : (
                      <span className="text-caption text-neutral-400" title={t('settings.notifications.addPhone', 'Add phone number in Account tab')}>
                        --
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!hasPhone && (
          <p className="mt-3 text-caption text-neutral-400">
            {t('settings.notifications.smsHint', 'Add a phone number in the Account tab to enable SMS notifications.')}
          </p>
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
