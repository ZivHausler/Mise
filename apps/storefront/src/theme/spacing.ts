/**
 * Spacing system — 8px base unit, all values multiples of 4.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export type SpacingToken = keyof typeof spacing;

/**
 * Component sizing constants.
 */
export const sizing = {
  pageHorizontalPadding: 16,
  cardBorderRadius: 16,
  buttonBorderRadius: 12,
  inputBorderRadius: 12,
  badgeBorderRadius: 999,
  imageBorderRadius: 12,
  buttonHeightPrimary: 52,
  buttonHeightSecondary: 44,
  inputFieldHeight: 52,
  categoryTabHeight: 36,
  floatingCartButtonHeight: 56,
  touchTargetMin: 44,
  quantityButtonDiameter: 36,
  quickAddButtonDiameter: 36,
  cartItemImageSize: 56,
  headerFullHeight: 140,
  headerCollapsedHeight: 56,
  searchBarHeight: 48,
  categoryTabsHeight: 44,
} as const;
