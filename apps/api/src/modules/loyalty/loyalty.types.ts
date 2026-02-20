export const LOYALTY_TRANSACTION_TYPE = {
  EARNED: 'earned',
  REDEEMED: 'redeemed',
  ADJUSTED: 'adjusted',
} as const;

export type LoyaltyTransactionType = (typeof LOYALTY_TRANSACTION_TYPE)[keyof typeof LOYALTY_TRANSACTION_TYPE];

export interface LoyaltyConfig {
  id: string;
  storeId: string;
  isActive: boolean;
  pointsPerShekel: number;
  pointValue: number;
  minRedeemPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  id: string;
  storeId: string;
  customerId: string;
  paymentId: string | null;
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
  customerId: string;
  paymentId?: string;
  type: LoyaltyTransactionType;
  points: number;
  description?: string;
}

export interface UpsertLoyaltyConfigDTO {
  isActive?: boolean;
  pointsPerShekel?: number;
  pointValue?: number;
  minRedeemPoints?: number;
}
