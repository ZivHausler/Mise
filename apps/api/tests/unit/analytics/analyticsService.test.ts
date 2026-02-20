import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../../../src/modules/analytics/analytics.service.js';

vi.mock('../../../src/modules/analytics/analytics.repository.js', () => ({
  PgAnalyticsRepository: {
    getRevenue: vi.fn(),
    getPopularRecipes: vi.fn(),
    getOrderStats: vi.fn(),
    getDashboard: vi.fn(),
    getCustomerFrequency: vi.fn(),
  },
}));

import { PgAnalyticsRepository } from '../../../src/modules/analytics/analytics.repository.js';

const STORE_ID = 'store-1';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService();
  });

  describe('getRevenue', () => {
    it('should return revenue data', async () => {
      const revenue = { daily: [{ date: '2025-01-01', total: 100 }], totalRevenue: 1000 };
      vi.mocked(PgAnalyticsRepository.getRevenue).mockResolvedValue(revenue);

      const result = await service.getRevenue(STORE_ID);
      expect(result).toEqual(revenue);
      expect(PgAnalyticsRepository.getRevenue).toHaveBeenCalledWith(STORE_ID);
    });
  });

  describe('getPopularRecipes', () => {
    it('should return popular recipes', async () => {
      const recipes = [{ recipe_id: 'r1', total_ordered: 50 }];
      vi.mocked(PgAnalyticsRepository.getPopularRecipes).mockResolvedValue(recipes);

      const result = await service.getPopularRecipes(STORE_ID);
      expect(result).toEqual(recipes);
    });
  });

  describe('getOrderStats', () => {
    it('should return order stats', async () => {
      const stats = [{ status: '0', count: 5 }, { status: '1', count: 3 }];
      vi.mocked(PgAnalyticsRepository.getOrderStats).mockResolvedValue(stats);

      const result = await service.getOrderStats(STORE_ID);
      expect(result).toHaveLength(2);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const dashboard = { todayOrders: 10, pendingOrders: 5, lowStockItems: 2, todayRevenue: 500 };
      vi.mocked(PgAnalyticsRepository.getDashboard).mockResolvedValue(dashboard);

      const result = await service.getDashboard(STORE_ID);
      expect(result).toEqual(dashboard);
    });
  });

  describe('getCustomerFrequency', () => {
    it('should return customer frequency data', async () => {
      const frequency = [{ id: 'c1', name: 'Jane', order_count: 10 }];
      vi.mocked(PgAnalyticsRepository.getCustomerFrequency).mockResolvedValue(frequency);

      const result = await service.getCustomerFrequency(STORE_ID);
      expect(result).toEqual(frequency);
    });
  });
});
