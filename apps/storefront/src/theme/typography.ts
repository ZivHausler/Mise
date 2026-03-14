/**
 * Type scale definitions.
 * Fonts: Heebo (Hebrew), Inter (English).
 */

import { TextStyle } from 'react-native';

export interface TypeStyle {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  lineHeight: number;
}

export const typography = {
  displayLarge: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 44,
  },
  displaySmall: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  headingLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  headingMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  headingSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  labelLarge: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  price: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  priceSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
} as const;

export type TypographyToken = keyof typeof typography;

export const fontFamilies = {
  he: {
    regular: 'Heebo_400Regular',
    medium: 'Heebo_500Medium',
    semibold: 'Heebo_600SemiBold',
    bold: 'Heebo_700Bold',
  },
  en: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
} as const;

/**
 * Get fontFamily string based on language and weight.
 */
export function getFontFamily(lang: 'he' | 'en', weight: TextStyle['fontWeight']): string {
  const families = fontFamilies[lang];
  switch (weight) {
    case '700':
    case 'bold':
      return families.bold;
    case '600':
      return families.semibold;
    case '500':
      return families.medium;
    default:
      return families.regular;
  }
}
