import { PgAnalyticsRepository } from './analytics.repository.js';
import type { RevenueData, PopularRecipe, OrderStat, DashboardData, CustomerFrequency } from './analytics.types.js';

export class AnalyticsService {
  async getRevenue(storeId: string): Promise<RevenueData> {
    return PgAnalyticsRepository.getRevenue(storeId);
  }

  async getPopularRecipes(storeId: string): Promise<PopularRecipe[]> {
    return PgAnalyticsRepository.getPopularRecipes(storeId);
  }

  async getOrderStats(storeId: string): Promise<OrderStat[]> {
    return PgAnalyticsRepository.getOrderStats(storeId);
  }

  async getDashboard(storeId: string): Promise<DashboardData> {
    return PgAnalyticsRepository.getDashboard(storeId);
  }

  async getCustomerFrequency(storeId: string): Promise<CustomerFrequency[]> {
    return PgAnalyticsRepository.getCustomerFrequency(storeId);
  }
}
