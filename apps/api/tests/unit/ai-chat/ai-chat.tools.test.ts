import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/modules/analytics/analytics.repository.js', () => ({
  PgAnalyticsRepository: {
    getDashboard: vi.fn(),
    getRevenue: vi.fn(),
    getPopularRecipes: vi.fn(),
    getOrderStats: vi.fn(),
    getCustomerFrequency: vi.fn(),
  },
}));

vi.mock('../../../src/modules/customers/customer.repository.js', () => ({
  PgCustomerRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/modules/recipes/recipe.repository.js', () => ({
  MongoRecipeRepository: {
    findAll: vi.fn(),
  },
}));

vi.mock('../../../src/modules/inventory/inventory.repository.js', () => ({
  PgInventoryRepository: {
    findAll: vi.fn(),
    findLowStock: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  PgOrderRepository: {
    findAll: vi.fn(),
  },
}));

import { executeToolCall } from '../../../src/modules/ai-chat/ai-chat.tools.js';
import { PgAnalyticsRepository } from '../../../src/modules/analytics/analytics.repository.js';
import { PgCustomerRepository } from '../../../src/modules/customers/customer.repository.js';
import { MongoRecipeRepository } from '../../../src/modules/recipes/recipe.repository.js';
import { PgInventoryRepository } from '../../../src/modules/inventory/inventory.repository.js';
import { PgOrderRepository } from '../../../src/modules/orders/order.repository.js';

const STORE_ID = 42;

describe('executeToolCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Analytics tools ────────────────────────────────────────

  it('getDashboard dispatches to PgAnalyticsRepository.getDashboard', async () => {
    const data = { todayOrders: 5 };
    vi.mocked(PgAnalyticsRepository.getDashboard).mockResolvedValue(data);

    const result = await executeToolCall('getDashboard', {}, STORE_ID);
    expect(PgAnalyticsRepository.getDashboard).toHaveBeenCalledWith(STORE_ID);
    expect(result).toEqual(data);
  });

  it('getRevenue dispatches to PgAnalyticsRepository.getRevenue', async () => {
    const data = { daily: [], totalRevenue: 0 };
    vi.mocked(PgAnalyticsRepository.getRevenue).mockResolvedValue(data);

    const result = await executeToolCall('getRevenue', {}, STORE_ID);
    expect(PgAnalyticsRepository.getRevenue).toHaveBeenCalledWith(STORE_ID);
    expect(result).toEqual(data);
  });

  it('getPopularRecipes dispatches to PgAnalyticsRepository.getPopularRecipes', async () => {
    const data = [{ recipe_id: 'r1', total_ordered: 10 }];
    vi.mocked(PgAnalyticsRepository.getPopularRecipes).mockResolvedValue(data);

    const result = await executeToolCall('getPopularRecipes', {}, STORE_ID);
    expect(PgAnalyticsRepository.getPopularRecipes).toHaveBeenCalledWith(STORE_ID);
    expect(result).toEqual(data);
  });

  it('getOrderStats dispatches to PgAnalyticsRepository.getOrderStats', async () => {
    const data = [{ status: '0', count: 3 }];
    vi.mocked(PgAnalyticsRepository.getOrderStats).mockResolvedValue(data);

    const result = await executeToolCall('getOrderStats', {}, STORE_ID);
    expect(PgAnalyticsRepository.getOrderStats).toHaveBeenCalledWith(STORE_ID);
    expect(result).toEqual(data);
  });

  it('getCustomerFrequency dispatches to PgAnalyticsRepository.getCustomerFrequency', async () => {
    const data = [{ id: 1, name: 'Jane', order_count: 10 }];
    vi.mocked(PgAnalyticsRepository.getCustomerFrequency).mockResolvedValue(data);

    const result = await executeToolCall('getCustomerFrequency', {}, STORE_ID);
    expect(PgAnalyticsRepository.getCustomerFrequency).toHaveBeenCalledWith(STORE_ID);
    expect(result).toEqual(data);
  });

  // ─── Customer tools ─────────────────────────────────────────

  it('listCustomers dispatches to PgCustomerRepository.findAll with search', async () => {
    const customers = [{ id: 1, name: 'Alice' }];
    vi.mocked(PgCustomerRepository.findAll).mockResolvedValue(customers as any);

    const result = await executeToolCall('listCustomers', { search: 'ali' }, STORE_ID);
    expect(PgCustomerRepository.findAll).toHaveBeenCalledWith(STORE_ID, 'ali');
    expect(result).toEqual(customers);
  });

  it('listCustomers dispatches to PgCustomerRepository.findAll without search', async () => {
    vi.mocked(PgCustomerRepository.findAll).mockResolvedValue([]);

    await executeToolCall('listCustomers', {}, STORE_ID);
    expect(PgCustomerRepository.findAll).toHaveBeenCalledWith(STORE_ID, undefined);
  });

  it('getCustomerDetails dispatches to PgCustomerRepository.findById', async () => {
    const customer = { id: 5, name: 'Bob' };
    vi.mocked(PgCustomerRepository.findById).mockResolvedValue(customer as any);

    const result = await executeToolCall('getCustomerDetails', { customerId: 5 }, STORE_ID);
    expect(PgCustomerRepository.findById).toHaveBeenCalledWith(5, STORE_ID);
    expect(result).toEqual(customer);
  });

  // ─── Recipe tools ───────────────────────────────────────────

  it('listRecipes dispatches to MongoRecipeRepository.findAll with filters', async () => {
    const recipes = [{ id: 'r1', name: 'Cake' }];
    vi.mocked(MongoRecipeRepository.findAll).mockResolvedValue(recipes as any);

    const result = await executeToolCall('listRecipes', { search: 'cake', tag: 'pastry' }, STORE_ID);
    expect(MongoRecipeRepository.findAll).toHaveBeenCalledWith(STORE_ID, { search: 'cake', tag: 'pastry' });
    expect(result).toEqual(recipes);
  });

  // ─── Inventory tools ────────────────────────────────────────

  it('listInventory with lowStockOnly dispatches to PgInventoryRepository.findLowStock', async () => {
    const items = [{ id: 1, name: 'Flour' }];
    vi.mocked(PgInventoryRepository.findLowStock).mockResolvedValue(items as any);

    const result = await executeToolCall('listInventory', { lowStockOnly: true }, STORE_ID);
    expect(PgInventoryRepository.findLowStock).toHaveBeenCalledWith(STORE_ID);
    expect(result).toEqual(items);
  });

  it('listInventory without lowStockOnly dispatches to PgInventoryRepository.findAll', async () => {
    const items = [{ id: 2, name: 'Sugar' }];
    vi.mocked(PgInventoryRepository.findAll).mockResolvedValue(items as any);

    const result = await executeToolCall('listInventory', { search: 'sug' }, STORE_ID);
    expect(PgInventoryRepository.findAll).toHaveBeenCalledWith(STORE_ID, 'sug');
    expect(result).toEqual(items);
  });

  // ─── Order tools ────────────────────────────────────────────

  it('getRecentOrders dispatches to PgOrderRepository.findAll with status filter', async () => {
    const orders = [{ id: 1, status: 0 }];
    vi.mocked(PgOrderRepository.findAll).mockResolvedValue(orders as any);

    const result = await executeToolCall('getRecentOrders', { status: 0 }, STORE_ID);
    expect(PgOrderRepository.findAll).toHaveBeenCalledWith(STORE_ID, { status: 0 });
    expect(result).toEqual(orders);
  });

  it('getRecentOrders dispatches to PgOrderRepository.findAll without status filter', async () => {
    vi.mocked(PgOrderRepository.findAll).mockResolvedValue([]);

    await executeToolCall('getRecentOrders', {}, STORE_ID);
    expect(PgOrderRepository.findAll).toHaveBeenCalledWith(STORE_ID, undefined);
  });

  // ─── storeId is always passed through ──────────────────────

  it('always passes storeId from parameter, never from user args', async () => {
    vi.mocked(PgAnalyticsRepository.getDashboard).mockResolvedValue({});

    // Even if args contain a storeId, the parameter storeId is used
    await executeToolCall('getDashboard', { storeId: 999 }, STORE_ID);
    expect(PgAnalyticsRepository.getDashboard).toHaveBeenCalledWith(STORE_ID);
  });

  // ─── Unknown tool ──────────────────────────────────────────

  it('returns error object for unknown tool name', async () => {
    const result = await executeToolCall('nonExistentTool', {}, STORE_ID);
    expect(result).toEqual({ error: 'Unknown tool: nonExistentTool' });
  });

  // ─── Results are capped at 50 items ────────────────────────

  it('caps listCustomers results at 50 items', async () => {
    const manyCustomers = Array.from({ length: 80 }, (_, i) => ({ id: i, name: `Customer ${i}` }));
    vi.mocked(PgCustomerRepository.findAll).mockResolvedValue(manyCustomers as any);

    const result = await executeToolCall('listCustomers', {}, STORE_ID);
    expect(result).toHaveLength(50);
  });

  it('caps listRecipes results at 50 items', async () => {
    const manyRecipes = Array.from({ length: 60 }, (_, i) => ({ id: `r${i}`, name: `Recipe ${i}` }));
    vi.mocked(MongoRecipeRepository.findAll).mockResolvedValue(manyRecipes as any);

    const result = await executeToolCall('listRecipes', {}, STORE_ID);
    expect(result).toHaveLength(50);
  });

  it('caps listInventory results at 50 items', async () => {
    const manyItems = Array.from({ length: 70 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    vi.mocked(PgInventoryRepository.findAll).mockResolvedValue(manyItems as any);

    const result = await executeToolCall('listInventory', {}, STORE_ID);
    expect(result).toHaveLength(50);
  });

  it('caps getRecentOrders results at 50 items', async () => {
    const manyOrders = Array.from({ length: 55 }, (_, i) => ({ id: i }));
    vi.mocked(PgOrderRepository.findAll).mockResolvedValue(manyOrders as any);

    const result = await executeToolCall('getRecentOrders', {}, STORE_ID);
    expect(result).toHaveLength(50);
  });
});
