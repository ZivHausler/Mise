// ---------------------------------------------------------------------------
// Centralized domain defaults & option arrays
// ---------------------------------------------------------------------------

// --- Date formats ----------------------------------------------------------
export const DATE_FORMATS = ['dd/mm/yyyy', 'mm/dd/yyyy'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];
export const DEFAULT_DATE_FORMAT: DateFormat = 'dd/mm/yyyy';

// --- Languages -------------------------------------------------------------
export const LANGUAGES = ['en', 'he', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'he';

/** Map frontend language codes to backend Language enum values (0=Hebrew,1=English,3=Arabic). */
export const LANGUAGE_TO_ENUM: Record<Language, number> = { he: 0, en: 1, ar: 3 };
/** Map backend Language enum values to frontend language codes. */
export const ENUM_TO_LANGUAGE: Record<number, Language> = { 0: 'he', 1: 'en', 3: 'ar' };

// --- Payment methods -------------------------------------------------------
export const PAYMENT_METHODS = ['cash', 'credit_card', 'bank_transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'cash';

/** Maps payment method values to their i18n key suffixes under "payments.*". */
export const PAYMENT_METHOD_I18N: Record<PaymentMethod, string> = {
  cash: 'cash',
  credit_card: 'card',
  bank_transfer: 'bankTransfer',
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
] as const;

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
