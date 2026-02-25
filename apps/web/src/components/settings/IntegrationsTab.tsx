import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Unplug, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { Card, Section, Stack } from '@/components/Layout';
import { cn } from '@/utils/cn';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { useWhatsAppConfig, useConnectWhatsApp, useDisconnectWhatsApp } from '@/api/hooks';
import { useAuthStore } from '@/store/auth';

const INTEGRATIONS_STORE_IDS = (import.meta.env.VITE_INTEGRATIONS_STORE_IDS ?? '').split(',').filter(Boolean);

declare global {
  interface Window {
    FB?: {
      init(params: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }): void;
      login(
        callback: (response: { authResponse?: { code: string } }) => void,
        params: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: { setup: Record<string, unknown>; featureType: string; sessionInfoVersion: string };
        },
      ): void;
    };
    fbAsyncInit?: () => void;
  }
}

const META_APP_ID = import.meta.env.VITE_META_APP_ID ?? '';
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID ?? '';

export default function IntegrationsTab() {
  const { t } = useTranslation();
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const isComingSoon = !activeStoreId || !INTEGRATIONS_STORE_IDS.includes(activeStoreId);
  const { data: config, isLoading } = useWhatsAppConfig();
  const connectMutation = useConnectWhatsApp();
  const disconnectMutation = useDisconnectWhatsApp();

  useEffect(() => {
    if (!META_APP_ID) return;
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: false,
        version: 'v21.0',
      });
    };
    // If SDK already loaded, init immediately
    if (window.FB) {
      window.FB.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: false,
        version: 'v21.0',
      });
    }
  }, []);

  const handleConnect = useCallback(() => {
    if (!window.FB) return;

    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          const code = response.authResponse.code;

          // The phoneNumberId and wabaId come from the embedded signup session
          // Meta sends these via the message event listener
          const handler = (event: MessageEvent) => {
            if (event.origin !== 'https://www.facebook.com') return;
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'WA_EMBEDDED_SIGNUP') {
                const { phone_number_id, waba_id } = data.data;
                if (phone_number_id && waba_id) {
                  connectMutation.mutate({ code, phoneNumberId: phone_number_id, wabaId: waba_id });
                }
                window.removeEventListener('message', handler);
              }
            } catch {
              // ignore non-JSON messages
            }
          };
          window.addEventListener('message', handler);
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: 2,
        },
      },
    );
  }, [connectMutation]);

  if (!isComingSoon && isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Stack gap={6}>
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-heading text-h3 text-neutral-800">
            {t('settings.integrations.title', 'Integrations')}
          </h2>
          {isComingSoon && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-500">
              <Sparkles className="h-3.5 w-3.5" />
              {t('nav.comingSoon', 'Coming soon')}
            </span>
          )}
        </div>
        <Section>
          <div className={cn('space-y-4', isComingSoon && 'opacity-60 pointer-events-none select-none')}>
            {/* WhatsApp Section */}
            <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-neutral-900">
                  {t('settings.integrations.whatsapp.title', 'WhatsApp Business')}
                </h3>
                <p className="mt-1 text-body-sm text-neutral-500">
                  {t('settings.integrations.whatsapp.description', 'Connect your WhatsApp Business number to send order notifications to customers.')}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {config?.connected ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-body-sm font-medium text-green-700">
                        {t('settings.integrations.whatsapp.connected', 'Connected')}
                      </span>
                      {config.phoneNumberId && (
                        <span className="text-body-sm text-neutral-500">
                          ({t('settings.integrations.whatsapp.phoneNumber', 'Phone Number')}: {config.phoneNumberId})
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-neutral-400" />
                      <span className="text-body-sm text-neutral-500">
                        {t('settings.integrations.whatsapp.notConnected', 'Not connected')}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 self-center sm:self-auto">
                {config?.connected ? (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Unplug className="h-4 w-4" />}
                    onClick={() => disconnectMutation.mutate()}
                    loading={disconnectMutation.isPending}
                  >
                    {t('settings.integrations.whatsapp.disconnect', 'Disconnect')}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<MessageSquare className="h-4 w-4" />}
                    onClick={handleConnect}
                    loading={connectMutation.isPending}
                    disabled={!META_APP_ID}
                  >
                    {t('settings.integrations.whatsapp.connect', 'Connect WhatsApp')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Section>
      </Card>
    </Stack>
  );
}
