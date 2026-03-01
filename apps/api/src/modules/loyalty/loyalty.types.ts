export const LOYALTY_TRANSACTION_TYPE = {
  EARNED: 'earned',
  REDEEMED: 'redeemed',
  ADJUSTED: 'adjusted',
} as const;

export type LoyaltyTransactionType = (typeof LOYALTY_TRANSACTION_TYPE)[keyof typeof LOYALTY_TRANSACTION_TYPE];

export interface LoyaltyConfig {
  id: number;
  storeId: number;
  isActive: boolean;
  pointsPerShekel: number;
  pointValue: number;
  minRedeemPoints: number;
  segmentVipOrderCount: number;
  segmentVipDays: number;
  segmentRegularOrderCount: number;
  segmentRegularDays: number;
  segmentNewDays: number;
  segmentDormantDays: number;
  birthdayReminderDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  id: number;
  storeId: number;
  customerId: number;
  paymentId: number | null;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
}

export interface CustomerLoyaltySummary {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
}

export interface CreateLoyaltyTransactionDTO {
  customerId: number;
  paymentId?: number;
  type: LoyaltyTransactionType;
  points: number;
  description?: string;
}

export interface UpsertLoyaltyConfigDTO {
  isActive?: boolean;
  pointsPerShekel?: number;
  pointValue?: number;
  minRedeemPoints?: number;
  segmentVipOrderCount?: number;
  segmentVipDays?: number;
  segmentRegularOrderCount?: number;
  segmentRegularDays?: number;
  segmentNewDays?: number;
  segmentDormantDays?: number;
  birthdayReminderDays?: number;
}

export type CustomerSegment = 'vip' | 'regular' | 'new' | 'dormant' | 'inactive';

export interface SegmentCounts {
  vip: number;
  regular: number;
  new: number;
  dormant: number;
  inactive: number;
}

export interface UpcomingBirthday {
  id: number;
  name: string;
  phone: string;
  birthday: string;
  daysUntil: number;
}

export interface DormantCustomer {
  id: number;
  name: string;
  phone: string;
  lastOrderDate: string;
  daysSinceLastOrder: number;
  totalOrders: number;
}

export interface LoyaltyDashboardData {
  upcomingBirthdays: UpcomingBirthday[];
  dormantCustomers: DormantCustomer[];
  segmentCounts: SegmentCounts;
}
