import React, { createContext, useContext, useMemo } from 'react';
import { palettes, ThemeName, ThemePalette } from './palettes';
import { createTokens, SemanticTokens } from './tokens';
import { typography, getFontFamily } from './typography';
import { spacing, sizing } from './spacing';

export interface Theme {
  name: ThemeName;
  palette: ThemePalette;
  colors: SemanticTokens;
  typography: typeof typography;
  spacing: typeof spacing;
  sizing: typeof sizing;
  font: (weight?: '400' | '500' | '600' | '700') => string;
}

const defaultThemeName: ThemeName = 'cream';

function buildTheme(name: ThemeName, lang: 'he' | 'en' = 'he'): Theme {
  const palette = palettes[name] ?? palettes.cream;
  return {
    name,
    palette,
    colors: createTokens(palette),
    typography,
    spacing,
    sizing,
    font: (weight = '400') => getFontFamily(lang, weight),
  };
}

const ThemeContext = createContext<Theme>(buildTheme(defaultThemeName));

interface ThemeProviderProps {
  themeName?: ThemeName;
  lang?: 'he' | 'en';
  children: React.ReactNode;
}

export function ThemeProvider({ themeName = defaultThemeName, lang = 'he', children }: ThemeProviderProps) {
  const theme = useMemo(() => buildTheme(themeName, lang), [themeName, lang]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
