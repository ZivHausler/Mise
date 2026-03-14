/**
 * 7 theme palettes — each defines a 10-shade color scale (50–900).
 * Sourced from existing THEME_PRESETS in the web app codebase.
 */

export interface ThemePalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export type ThemeName = 'cream' | 'white' | 'stone' | 'rose' | 'mint' | 'sky' | 'lavender';

export const palettes: Record<ThemeName, ThemePalette> = {
  cream: {
    50: '#FDF8F3',
    100: '#F9EDE0',
    200: '#F0D9BF',
    300: '#E4BF94',
    400: '#D4A06A',
    500: '#C4823E',
    600: '#A86B2E',
    700: '#7A4D20',
    800: '#5C3A18',
    900: '#3D2610',
  },
  white: {
    50: '#FFFFFF',
    100: '#F9FAFB',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  stone: {
    50: '#F5F5F3',
    100: '#ECECEA',
    200: '#D5D5D0',
    300: '#B5B5AD',
    400: '#8E8E83',
    500: '#6B6B60',
    600: '#55554C',
    700: '#3E3E35',
    800: '#2C2C25',
    900: '#1A1A16',
  },
  rose: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#5C1010',
  },
  mint: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  sky: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  lavender: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
  },
};
