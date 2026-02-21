import { PgAnalyticsRepository } from './analytics.repository.js';
import type { RevenueData, PopularRecipe, OrderStat, DashboardData, CustomerFrequency } from './analytics.types.js';

export class AnalyticsService {
  async getRevenue(storeId: number): Promise<RevenueData> {
    return PgAnalyticsRepository.getRevenue(storeId);
  }

  async getPopularRecipes(storeId: number): Promise<PopularRecipe[]> {
    return PgAnalyticsRepository.getPopularRecipes(storeId);
  }

  async getOrderStats(storeId: number): Promise<OrderStat[]> {
    return PgAnalyticsRepository.getOrderStats(storeId);
  }

  async getDashboard(storeId: number): Promise<DashboardData> {
    return PgAnalyticsRepository.getDashboard(storeId);
  }

  async getCustomerFrequency(storeId: number): Promise<CustomerFrequency[]> {
    return PgAnalyticsRepository.getCustomerFrequency(storeId);
  }
}
