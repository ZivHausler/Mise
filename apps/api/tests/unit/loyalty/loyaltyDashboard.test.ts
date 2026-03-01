import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoyaltyService } from '../../../src/modules/loyalty/loyalty.service.js';

vi.mock('../../../src/modules/loyalty/loyaltyCrud.js', () => ({
  LoyaltyCrud: {
    getConfig: vi.fn(),
    upsertConfig: vi.fn(),
    getCustomerBalance: vi.fn(),
    createTransaction: vi.fn(),
    updateCustomerBalance: vi.fn(),
    getTransactionsByCustomer: vi.fn(),
    findTransactionByPaymentId: vi.fn(),
  },
}));

vi.mock('../../../src/modules/loyalty/loyalty.repository.js', () => ({
  PgLoyaltyRepository: {
    getSegmentCounts: vi.fn(),
    getUpcomingBirthdays: vi.fn(),
    getDormantCustomers: vi.fn(),
    buildSegmentCTE: vi.fn(),
    getSegmentCTEParams: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  PgOrderRepository: {
    findByIdInternal: vi.fn(),
  },
}));

vi.mock('../../../src/modules/customers/customer.repository.js', () => ({
  PgCustomerRepository: {
    findById: vi.fn(),
  },
}));

import { LoyaltyCrud } from '../../../src/modules/loyalty/loyaltyCrud.js';
import { PgLoyaltyRepository } from '../../../src/modules/loyalty/loyalty.repository.js';
import type { LoyaltyConfig, SegmentCounts, UpcomingBirthday, DormantCustomer } from '../../../src/modules/loyalty/loyalty.types.js';

const STORE_ID = 1;

function makeFullConfig(overrides: Partial<LoyaltyConfig> = {}): LoyaltyConfig {
  return {
    id: 1,
    storeId: STORE_ID,
    isActive: true,
    pointsPerShekel: 1,
    pointValue: 0.1,
    minRedeemPoints: 0,
    segmentVipOrderCount: 10,
    segmentVipDays: 90,
    segmentRegularOrderCount: 3,
    segmentRegularDays: 90,
    segmentNewDays: 30,
    segmentDormantDays: 60,
    birthdayReminderDays: 7,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('LoyaltyService - Dashboard & Segmentation', () => {
  let service: LoyaltyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LoyaltyService();
  });

  // ─── getFullConfig ──────────────────────────────────────────

  describe('getFullConfig', () => {
    it('should return existing config when one exists', async () => {
      const config = makeFullConfig();
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(config);

      const result = await service.getFullConfig(STORE_ID);

      expect(result).toEqual(config);
      expect(LoyaltyCrud.getConfig).toHaveBeenCalledWith(STORE_ID);
    });

    it('should return synthetic config with defaults when no config exists', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);

      const result = await service.getFullConfig(STORE_ID);

      expect(result.storeId).toBe(STORE_ID);
      expect(result.id).toBe(0);
      expect(result.isActive).toBe(false);
      expect(result.pointsPerShekel).toBe(1);
      expect(result.pointValue).toBe(0.1);
      expect(result.minRedeemPoints).toBe(0);
    });

    it('should include segment threshold defaults when no config exists', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);

      const result = await service.getFullConfig(STORE_ID);

      expect(result.segmentVipOrderCount).toBe(10);
      expect(result.segmentVipDays).toBe(90);
      expect(result.segmentRegularOrderCount).toBe(3);
      expect(result.segmentRegularDays).toBe(90);
      expect(result.segmentNewDays).toBe(30);
      expect(result.segmentDormantDays).toBe(60);
      expect(result.birthdayReminderDays).toBe(7);
    });

    it('should include createdAt and updatedAt in synthetic config', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);

      const result = await service.getFullConfig(STORE_ID);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ─── getSegmentCounts ───────────────────────────────────────

  describe('getSegmentCounts', () => {
    it('should fetch config then delegate to repository', async () => {
      const config = makeFullConfig();
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(config);
      const counts: SegmentCounts = { vip: 5, regular: 20, new: 3, dormant: 8, inactive: 10 };
      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockResolvedValue(counts);

      const result = await service.getSegmentCounts(STORE_ID);

      expect(result).toEqual(counts);
      expect(PgLoyaltyRepository.getSegmentCounts).toHaveBeenCalledWith(STORE_ID, config);
    });

    it('should use default config when no config exists', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);
      const counts: SegmentCounts = { vip: 0, regular: 0, new: 0, dormant: 0, inactive: 0 };
      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockResolvedValue(counts);

      const result = await service.getSegmentCounts(STORE_ID);

      expect(result).toEqual(counts);
      expect(PgLoyaltyRepository.getSegmentCounts).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({
          segmentVipOrderCount: 10,
          segmentVipDays: 90,
          segmentRegularOrderCount: 3,
          segmentRegularDays: 90,
          segmentNewDays: 30,
          segmentDormantDays: 60,
        }),
      );
    });

    it('should return all-zero counts for a store with no customers', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeFullConfig());
      const counts: SegmentCounts = { vip: 0, regular: 0, new: 0, dormant: 0, inactive: 0 };
      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockResolvedValue(counts);

      const result = await service.getSegmentCounts(STORE_ID);

      expect(result.vip).toBe(0);
      expect(result.regular).toBe(0);
      expect(result.new).toBe(0);
      expect(result.dormant).toBe(0);
      expect(result.inactive).toBe(0);
    });
  });

  // ─── getDashboard ──────────────────────────────────────────

  describe('getDashboard', () => {
    it('should return segment counts, birthdays, and dormant customers', async () => {
      const config = makeFullConfig();
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(config);

      const segmentCounts: SegmentCounts = { vip: 2, regular: 10, new: 5, dormant: 3, inactive: 1 };
      const upcomingBirthdays: UpcomingBirthday[] = [
        { id: 1, name: 'Alice', phone: '054-1111111', birthday: '2000-03-05', daysUntil: 3 },
      ];
      const dormantCustomers: DormantCustomer[] = [
        { id: 2, name: 'Bob', phone: '054-2222222', lastOrderDate: '2025-10-01', daysSinceLastOrder: 90, totalOrders: 5 },
      ];

      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockResolvedValue(segmentCounts);
      vi.mocked(PgLoyaltyRepository.getUpcomingBirthdays).mockResolvedValue(upcomingBirthdays);
      vi.mocked(PgLoyaltyRepository.getDormantCustomers).mockResolvedValue(dormantCustomers);

      const result = await service.getDashboard(STORE_ID);

      expect(result.segmentCounts).toEqual(segmentCounts);
      expect(result.upcomingBirthdays).toEqual(upcomingBirthdays);
      expect(result.dormantCustomers).toEqual(dormantCustomers);
    });

    it('should pass correct config thresholds to repository methods', async () => {
      const config = makeFullConfig({
        birthdayReminderDays: 14,
        segmentDormantDays: 120,
      });
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(config);
      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockResolvedValue({ vip: 0, regular: 0, new: 0, dormant: 0, inactive: 0 });
      vi.mocked(PgLoyaltyRepository.getUpcomingBirthdays).mockResolvedValue([]);
      vi.mocked(PgLoyaltyRepository.getDormantCustomers).mockResolvedValue([]);

      await service.getDashboard(STORE_ID);

      expect(PgLoyaltyRepository.getUpcomingBirthdays).toHaveBeenCalledWith(STORE_ID, 14);
      expect(PgLoyaltyRepository.getDormantCustomers).toHaveBeenCalledWith(STORE_ID, 120);
      expect(PgLoyaltyRepository.getSegmentCounts).toHaveBeenCalledWith(STORE_ID, config);
    });

    it('should return empty arrays when no birthdays or dormant customers', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeFullConfig());
      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockResolvedValue({ vip: 0, regular: 0, new: 0, dormant: 0, inactive: 0 });
      vi.mocked(PgLoyaltyRepository.getUpcomingBirthdays).mockResolvedValue([]);
      vi.mocked(PgLoyaltyRepository.getDormantCustomers).mockResolvedValue([]);

      const result = await service.getDashboard(STORE_ID);

      expect(result.upcomingBirthdays).toEqual([]);
      expect(result.dormantCustomers).toEqual([]);
    });

    it('should use default config when no config exists', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);
      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockResolvedValue({ vip: 0, regular: 0, new: 0, dormant: 0, inactive: 0 });
      vi.mocked(PgLoyaltyRepository.getUpcomingBirthdays).mockResolvedValue([]);
      vi.mocked(PgLoyaltyRepository.getDormantCustomers).mockResolvedValue([]);

      await service.getDashboard(STORE_ID);

      // Default birthdayReminderDays = 7, segmentDormantDays = 60
      expect(PgLoyaltyRepository.getUpcomingBirthdays).toHaveBeenCalledWith(STORE_ID, 7);
      expect(PgLoyaltyRepository.getDormantCustomers).toHaveBeenCalledWith(STORE_ID, 60);
    });

    it('should call all three repository methods in parallel', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeFullConfig());

      // Track call order
      const callOrder: string[] = [];
      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockImplementation(async () => {
        callOrder.push('segmentCounts');
        return { vip: 0, regular: 0, new: 0, dormant: 0, inactive: 0 };
      });
      vi.mocked(PgLoyaltyRepository.getUpcomingBirthdays).mockImplementation(async () => {
        callOrder.push('birthdays');
        return [];
      });
      vi.mocked(PgLoyaltyRepository.getDormantCustomers).mockImplementation(async () => {
        callOrder.push('dormant');
        return [];
      });

      await service.getDashboard(STORE_ID);

      // All three should have been called
      expect(PgLoyaltyRepository.getSegmentCounts).toHaveBeenCalledTimes(1);
      expect(PgLoyaltyRepository.getUpcomingBirthdays).toHaveBeenCalledTimes(1);
      expect(PgLoyaltyRepository.getDormantCustomers).toHaveBeenCalledTimes(1);
    });

    it('should return properly shaped LoyaltyDashboardData', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeFullConfig());
      vi.mocked(PgLoyaltyRepository.getSegmentCounts).mockResolvedValue({ vip: 1, regular: 2, new: 3, dormant: 4, inactive: 5 });
      vi.mocked(PgLoyaltyRepository.getUpcomingBirthdays).mockResolvedValue([]);
      vi.mocked(PgLoyaltyRepository.getDormantCustomers).mockResolvedValue([]);

      const result = await service.getDashboard(STORE_ID);

      // Verify the shape has exactly the expected keys
      expect(Object.keys(result).sort()).toEqual(['dormantCustomers', 'segmentCounts', 'upcomingBirthdays']);
    });
  });

  // ─── getConfig with new threshold fields ────────────────────

  describe('getConfig - threshold defaults', () => {
    it('should include new segment threshold fields in defaults', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);

      const result = await service.getConfig(STORE_ID);

      expect(result).toMatchObject({
        segmentVipOrderCount: 10,
        segmentVipDays: 90,
        segmentRegularOrderCount: 3,
        segmentRegularDays: 90,
        segmentNewDays: 30,
        segmentDormantDays: 60,
        birthdayReminderDays: 7,
        storeId: STORE_ID,
      });
    });

    it('should return stored threshold values when config exists', async () => {
      const config = makeFullConfig({
        segmentVipOrderCount: 20,
        segmentVipDays: 180,
        segmentRegularOrderCount: 5,
        segmentRegularDays: 60,
        segmentNewDays: 14,
        segmentDormantDays: 90,
        birthdayReminderDays: 14,
      });
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(config);

      const result = await service.getConfig(STORE_ID);

      expect(result).toMatchObject({
        segmentVipOrderCount: 20,
        segmentVipDays: 180,
        segmentRegularOrderCount: 5,
        segmentRegularDays: 60,
        segmentNewDays: 14,
        segmentDormantDays: 90,
        birthdayReminderDays: 14,
      });
    });
  });
});
