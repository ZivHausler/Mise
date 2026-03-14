/**
 * Semantic design tokens mapped from palette shades.
 */

import { ThemePalette } from './palettes';

export interface SemanticTokens {
  // Surface / background
  surface: string;
  surfaceSecondary: string;
  card: string;

  // Borders
  border: string;

  // Text
  textTertiary: string;
  textSecondary: string;
  textPrimary: string;
  textStrong: string;
  textOnSurface: string;

  // Primary action
  primary: string;
  primaryPressed: string;
  onPrimary: string;

  // Semantic colors (fixed, not themed)
  error: string;
  success: string;
  warning: string;
  overlay: string;
}

export function createTokens(palette: ThemePalette): SemanticTokens {
  return {
    surface: '#FFFFFF',
    surfaceSecondary: palette[100],
    card: palette[50],
    border: palette[200],
    textTertiary: palette[400],
    textSecondary: palette[400],
    textPrimary: palette[700],
    textStrong: palette[800],
    textOnSurface: palette[900],
    primary: palette[500],
    primaryPressed: palette[600],
    onPrimary: '#FFFFFF',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    overlay: 'rgba(0,0,0,0.5)',
  };
}
