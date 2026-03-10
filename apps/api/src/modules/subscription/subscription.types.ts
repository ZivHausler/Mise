export type PlanSlug = 'free' | 'basic' | 'pro';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
export type SubscriptionEventType =
  | 'created'
  | 'upgraded'
  | 'downgraded'
  | 'canceled'
  | 'renewed'
  | 'trial_started'
  | 'trial_expired'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'downgrade_scheduled'
  | 'downgrade_canceled'
  | 'pending_plan_changed'
  | 'trial_reminder_3d'
  | 'trial_reminder_1d'
  | 'trial_reminder_0d'
  | 'checkout_initiated'
  | 'checkout_completed'
  | 'checkout_failed'
  | 'checkout_expired'
  | 'renewal_charge_failed'
  | 'renewal_recovery_succeeded'
  | 'grace_period_started'
  | 'grace_period_expired'
  | 'auto_downgraded_payment_failed';

export interface Plan {
  id: number;
  slug: PlanSlug;
  name: string;
  priceNis: number;
  features: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface StoreSubscription {
  id: number;
  storeId: number;
  planId: number;
  planSlug: PlanSlug;
  planName: string;
  priceNis: number;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  downgradeToSlug: PlanSlug | null;
  billingAnchorDay: number | null;
  features: string[];
  paymentProvider: 'payplus' | 'paypal' | null;
  providerSubscriptionId: string | null;
  gracePeriodEnd: string | null;
  paymentFailedCount: number;
}

export interface SubscriptionEvent {
  id: number;
  storeId: number;
  subscriptionId: number | null;
  eventType: SubscriptionEventType;
  fromPlanId: number | null;
  toPlanId: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Payment enums
export enum PaymentType { FULL = 0, PRORATION = 1, REFUND = 2 }
export enum PaymentStatus { PENDING = 0, SUCCEEDED = 1, FAILED = 2 }

// Payment record interface
export interface SubscriptionPayment {
  id: number;
  storeId: number;
  subscriptionId: number;
  amountAgorot: number;
  type: PaymentType;
  description: string | null;
  fromPlanId: number | null;
  toPlanId: number | null;
  prorationDays: number | null;
  periodDays: number | null;
  status: PaymentStatus;
  externalRef: string | null;
  createdAt: string;
}

// Preview response for plan changes
export interface PlanChangePreview {
  type: 'upgrade' | 'downgrade' | 'trial_selection';
  currentPlan: string;
  targetPlan: string;
  immediateChargeAgorot: number | null;
  nextRenewalAmountAgorot: number;
  nextRenewalDate: string;
  daysRemaining: number;
  daysInPeriod: number;
  effectiveDate: string;
}
