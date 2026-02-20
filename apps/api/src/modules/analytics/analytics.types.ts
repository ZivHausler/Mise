export interface DailyRevenue {
  date: string;
  total: number;
}

export interface RevenueData {
  daily: DailyRevenue[];
  totalRevenue: number;
}

export interface PopularRecipe {
  recipe_id: string;
  total_ordered: number;
}

export interface OrderStat {
  status: string;
  count: number;
}

export interface DashboardData {
  todayOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  todayRevenue: number;
}

export interface CustomerFrequency {
  id: string;
  name: string;
  order_count: number;
}
