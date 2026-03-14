/**
 * Wraps children with a ThemeProvider that reads the current store's theme.
 * Use this around store-specific screens (Menu, Cart) so they reflect the
 * store owner's chosen theme while the rest of the app keeps the default.
 */
import React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { useStoreStore } from '../stores';
import type { ThemeName } from './palettes';

const VALID_THEMES: ThemeName[] = ['cream', 'white', 'stone', 'rose', 'mint', 'sky', 'lavender'];

export function StoreThemeProvider({ children }: { children: React.ReactNode }) {
  const storeInfo = useStoreStore((s) => s.storeInfo);
  const applyTheme = storeInfo?.applyThemeToApp !== false;
  const storeTheme = storeInfo?.theme;
  const themeName = applyTheme && storeTheme && VALID_THEMES.includes(storeTheme as ThemeName)
    ? (storeTheme as ThemeName)
    : 'cream';
  return <ThemeProvider themeName={themeName}>{children}</ThemeProvider>;
}
