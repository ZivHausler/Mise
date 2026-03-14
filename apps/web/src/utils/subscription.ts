/**
 * Feature-to-tier mapping — which plan unlocks each feature.
 * Features not listed here are available on all tiers (free).
 */
export const FEATURE_TIER_MAP: Record<string, 'basic' | 'pro'> = {
  dashboard: 'basic',
  customers: 'basic',
  orders: 'basic',
  payments: 'basic',
  invoices: 'basic',
  notifications: 'basic',
  production: 'pro',
  loyalty: 'pro',
  loyaltyEnhancements: 'pro',
  whatsapp: 'pro',
  sms: 'pro',
  ai_chat: 'pro',
  receiptScanner: 'pro',
};

/** Plan features for display in PricingCards */
export const PLAN_FEATURES: Record<string, string[]> = {
  free: ['inventory', 'recipes', 'generalSettings', 'teamSettings'],
  basic: ['dashboard', 'customers', 'orders', 'payments', 'notifications'],
  pro: ['production', 'loyalty', 'whatsapp', 'ai_chat', 'receiptScanner'],
};

/** Tier sort order for comparison */
export const TIER_ORDER: Record<string, number> = {
  free: 0,
  trial: 1,
  basic: 2,
  pro: 3,
};

/** Check if a tier is higher than another */
export function isTierHigher(tier: string, than: string): boolean {
  return (TIER_ORDER[tier] ?? 0) > (TIER_ORDER[than] ?? 0);
}

/** Check if a tier is lower than another */
export function isTierLower(tier: string, than: string): boolean {
  return (TIER_ORDER[tier] ?? 0) < (TIER_ORDER[than] ?? 0);
}

/** Plan prices in NIS */
export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 99,
  pro: 199,
};
