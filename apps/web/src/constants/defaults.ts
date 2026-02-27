// ---------------------------------------------------------------------------
// Centralized domain defaults & option arrays
// ---------------------------------------------------------------------------

// --- Date formats ----------------------------------------------------------
export const DATE_FORMATS = ['dd/mm/yyyy', 'mm/dd/yyyy'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];
export const DEFAULT_DATE_FORMAT: DateFormat = 'dd/mm/yyyy';

// --- Time formats ----------------------------------------------------------
export const TIME_FORMATS = ['24h', '12h'] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];
export const DEFAULT_TIME_FORMAT: TimeFormat = '24h';

// --- Languages -------------------------------------------------------------
export const LANGUAGES = ['en', 'he', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'he';

/** Map frontend language codes to backend Language enum values (0=Hebrew,1=English,3=Arabic). */
export const LANGUAGE_TO_ENUM: Record<Language, number> = { he: 0, en: 1, ar: 3 };
/** Map backend Language enum values to frontend language codes. */
export const ENUM_TO_LANGUAGE: Record<number, Language> = { 0: 'he', 1: 'en', 3: 'ar' };

// --- Payment methods -------------------------------------------------------
export const PAYMENT_METHODS = ['cash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'cash';

/** Maps payment method values to their i18n key suffixes under "payments.*". */
export const PAYMENT_METHOD_I18N: Record<PaymentMethod, string> = {
  cash: 'cash',
};

// --- Store roles -----------------------------------------------------------
export const STORE_ROLES = { ADMIN: -1, OWNER: 1, MANAGER: 2, EMPLOYEE: 3 } as const;

export const ROLE_LABELS: Record<number, string> = {
  [STORE_ROLES.ADMIN]: 'System Admin',
  [STORE_ROLES.OWNER]: 'Owner',
  [STORE_ROLES.MANAGER]: 'Manager',
  [STORE_ROLES.EMPLOYEE]: 'Employee',
};

/** Roles available when inviting (excludes Owner). */
export const INVITE_ROLE_OPTIONS = [
  { value: String(STORE_ROLES.MANAGER), label: ROLE_LABELS[STORE_ROLES.MANAGER] },
  { value: String(STORE_ROLES.EMPLOYEE), label: ROLE_LABELS[STORE_ROLES.EMPLOYEE] },
];

// --- Notification events ---------------------------------------------------
export const NOTIFICATION_EVENTS = [
  'order_created',
  'low_stock',
  'payment_received',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

// --- Preset colors (for groups) --------------------------------------------
export const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#92400E',
  '#171717',
] as const;

// --- App themes (store background) -----------------------------------------
export const APP_THEMES = ['cream', 'white', 'stone', 'rose', 'mint', 'sky', 'lavender'] as const;
export type AppTheme = (typeof APP_THEMES)[number];
export const DEFAULT_THEME: AppTheme = 'cream';

export type ThemePalette = Record<string, string>;

export const THEME_PRESETS: Record<AppTheme, { nameKey: string; colors: ThemePalette }> = {
  cream: {
    nameKey: 'settings.themes.cream',
    colors: {
      '50': '#FDF8F3', '100': '#FAF0E4', '200': '#F3DCC5', '300': '#E8C49A', '400': '#D4A06A',
      '500': '#C4823E', '600': '#A66A2E', '700': '#7A4D20', '800': '#5C3A18', '900': '#3D2610',
    },
  },
  white: {
    nameKey: 'settings.themes.white',
    colors: {
      '50': '#FFFFFF', '100': '#F9FAFB', '200': '#F3F4F6', '300': '#D1D5DB', '400': '#9CA3AF',
      '500': '#6B7280', '600': '#4B5563', '700': '#374151', '800': '#1F2937', '900': '#111827',
    },
  },
  stone: {
    nameKey: 'settings.themes.stone',
    colors: {
      '50': '#F5F5F3', '100': '#E8E8E4', '200': '#D5D5CF', '300': '#B8B8AE', '400': '#8A8A7F',
      '500': '#6B6B60', '600': '#545449', '700': '#3E3E35', '800': '#2A2A24', '900': '#1A1A16',
    },
  },
  rose: {
    nameKey: 'settings.themes.rose',
    colors: {
      '50': '#FEF2F2', '100': '#FDE8E8', '200': '#FECACA', '300': '#FCA5A5', '400': '#F87171',
      '500': '#EF4444', '600': '#DC2626', '700': '#B91C1C', '800': '#7F1D1D', '900': '#5C1010',
    },
  },
  mint: {
    nameKey: 'settings.themes.mint',
    colors: {
      '50': '#F0FDF4', '100': '#DCFCE7', '200': '#BBF7D0', '300': '#86EFAC', '400': '#4ADE80',
      '500': '#22C55E', '600': '#16A34A', '700': '#15803D', '800': '#166534', '900': '#14532D',
    },
  },
  sky: {
    nameKey: 'settings.themes.sky',
    colors: {
      '50': '#EFF6FF', '100': '#DBEAFE', '200': '#BFDBFE', '300': '#93C5FD', '400': '#60A5FA',
      '500': '#3B82F6', '600': '#2563EB', '700': '#1D4ED8', '800': '#1E40AF', '900': '#1E3A8A',
    },
  },
  lavender: {
    nameKey: 'settings.themes.lavender',
    colors: {
      '50': '#FAF5FF', '100': '#F3E8FF', '200': '#E9D5FF', '300': '#D8B4FE', '400': '#C084FC',
      '500': '#A855F7', '600': '#9333EA', '700': '#7E22CE', '800': '#6B21A8', '900': '#581C87',
    },
  },
};

/** Apply a theme's full color palette to the document root CSS variables. */
export function applyThemePalette(theme: AppTheme): void {
  const colors = THEME_PRESETS[theme]?.colors ?? THEME_PRESETS[DEFAULT_THEME].colors;
  const style = document.documentElement.style;
  for (const [shade, hex] of Object.entries(colors)) {
    style.setProperty(`--primary-${shade}`, hex);
  }
}

// --- Stock statuses --------------------------------------------------------
export const STOCK_STATUSES = ['good', 'ok', 'low', 'out'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

// --- Inventory adjust types ------------------------------------------------
export const ADJUST_TYPES = ['add', 'use', 'set'] as const;
export type AdjustType = (typeof ADJUST_TYPES)[number];

// --- Week start day --------------------------------------------------------
export const WEEK_START_DAYS = ['sunday', 'monday'] as const;
export type WeekStartDay = (typeof WEEK_START_DAYS)[number];
export const DEFAULT_WEEK_START_DAY: WeekStartDay = 'sunday';

// --- Calendar day visibility -----------------------------------------------
export const DEFAULT_SHOW_FRIDAY = true;
export const DEFAULT_SHOW_SATURDAY = false;

// --- Unit categories -------------------------------------------------------
export const UNIT_CATEGORIES = ['weight', 'volume', 'count'] as const;
export type UnitCategory = (typeof UNIT_CATEGORIES)[number];
