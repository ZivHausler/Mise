import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Card, Section, Stack } from '@/components/Layout';
import { Toggle } from '@/components/FormFields';
import { useAuthStore } from '@/store/auth';
import { useUpdateStoreTheme, useCurrentStore } from '@/api/hooks';
import { APP_THEMES, THEME_PRESETS, applyThemePalette } from '@/constants/defaults';
import type { AppTheme } from '@/constants/defaults';

export default function AppearanceTab() {
  const { t } = useTranslation();
  const stores = useAuthStore((s) => s.stores);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const updateTheme = useUpdateStoreTheme();
  const { data: currentStore } = useCurrentStore();

  const activeStore = stores.find((s) => String(s.storeId) === String(activeStoreId)) ?? stores[0];
  const currentTheme = (activeStore?.store?.theme as AppTheme) || 'cream';
  const applyThemeToApp = currentStore?.applyThemeToApp ?? true;

  return (
    <Stack gap={6}>
      <Card>
        <Section title={t('settings.appearance', 'Appearance')}>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {APP_THEMES.map((theme) => (
              <ThemeOption
                key={theme}
                theme={theme}
                selected={theme === currentTheme}
                onClick={() => {
                  updateTheme.mutate({ theme });
                  applyThemePalette(theme);
                  const updatedStores = stores.map((s) =>
                    String(s.storeId) === String(activeStoreId) ? { ...s, store: { ...s.store, theme } } : s,
                  );
                  useAuthStore.getState().setStores(updatedStores);
                }}
              />
            ))}
          </div>
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.appearance.mobileApp', 'Mobile App')}>
          <Toggle
            label={t('settings.appearance.applyThemeToApp', 'Apply theme to storefront app')}
            checked={applyThemeToApp}
            onChange={(checked) => updateTheme.mutate({ applyThemeToApp: checked })}
            disabled={updateTheme.isPending}
          />
          <p className="mt-1 text-body-sm text-neutral-500">
            {t('settings.appearance.applyThemeToAppDescription', 'When enabled, the selected theme will also be applied to the customer-facing mobile app.')}
          </p>
        </Section>
      </Card>
    </Stack>
  );
}

function ThemeOption({ theme, selected, onClick }: { theme: AppTheme; selected: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const { nameKey, colors } = THEME_PRESETS[theme];

  return (
    <button type="button" className="flex flex-col items-center gap-1" onClick={onClick}>
      <div
        className={`relative w-full aspect-[3/2] rounded-md overflow-hidden border transition-all ${
          selected ? 'ring-2 ring-primary-500 border-primary-500' : 'border-neutral-200 hover:border-neutral-300'
        }`}
      >
        <div className="absolute inset-y-0 start-0 w-3.5 flex flex-col items-center gap-0.5 pt-2" style={{ backgroundColor: colors['900'] }}>
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>
        <div className="absolute inset-y-0 start-3.5 end-0 flex flex-col gap-0.5 p-1.5" style={{ backgroundColor: colors['50'] }}>
          <div className="w-full h-3 rounded-sm bg-white shadow-sm" />
          <div className="flex gap-0.5 mt-auto">
            <div className="w-5 h-2 rounded-full" style={{ backgroundColor: colors['500'], opacity: 0.7 }} />
            <div className="w-5 h-2 rounded-full" style={{ backgroundColor: colors['500'], opacity: 0.4 }} />
          </div>
        </div>
        {selected && (
          <div className="absolute top-0.5 end-0.5 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>
      <span className="text-[11px] text-neutral-600 font-medium">
        {t(nameKey, theme.charAt(0).toUpperCase() + theme.slice(1))}
      </span>
    </button>
  );
}
