import type { FunctionDeclaration } from '@google/genai';
import { PgAnalyticsRepository } from '../analytics/analytics.repository.js';
import { PgCustomerRepository } from '../customers/customer.repository.js';
import { MongoRecipeRepository } from '../recipes/recipe.repository.js';
import { PgInventoryRepository } from '../inventory/inventory.repository.js';
import { PgOrderRepository } from '../orders/order.repository.js';
import type { OrderStatus } from '../orders/order.types.js';

const MAX_ITEMS = 50;

function cap<T>(items: T[]): T[] {
  return items.slice(0, MAX_ITEMS);
}

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'getDashboard',
    description: 'Get dashboard summary: today\'s orders, pending orders, low stock count, today\'s revenue.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getRevenue',
    description: 'Get revenue data: daily revenue for the last 30 days and total all-time revenue.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getPopularRecipes',
    description: 'Get the top 10 most ordered recipes by total quantity ordered.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getOrderStats',
    description: 'Get order counts grouped by status (received=0, in_progress=1, ready=2, delivered=3).',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getCustomerFrequency',
    description: 'Get top 20 customers ranked by number of orders.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'listCustomers',
    description: 'List customers, optionally filtered by a search term (name, email, or phone).',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Optional search term to filter customers by name, email, or phone.' },
      },
      required: [],
    },
  },
  {
    name: 'getCustomerDetails',
    description: 'Get full details for a specific customer by their ID, including order count and total spent.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'number', description: 'The numeric customer ID.' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'listRecipes',
    description: 'List recipes, optionally filtered by search term (name) and/or tag.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Optional search term to filter recipes by name.' },
        tag: { type: 'string', description: 'Optional tag to filter recipes.' },
      },
      required: [],
    },
  },
  {
    name: 'listInventory',
    description: 'List inventory ingredients. Can filter by search term or show only low-stock items.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Optional search term to filter ingredients by name.' },
        lowStockOnly: { type: 'boolean', description: 'If true, only return items below their low stock threshold.' },
      },
      required: [],
    },
  },
  {
    name: 'getRecentOrders',
    description: 'Get recent orders, optionally filtered by status. Returns the 50 most recent orders.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'number',
          description: 'Optional order status filter: 0=received, 1=in_progress, 2=ready, 3=delivered.',
          enum: [0, 1, 2, 3],
        },
      },
      required: [],
    },
  },
];

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  storeId: number,
): Promise<unknown> {
  switch (name) {
    case 'getDashboard':
      return PgAnalyticsRepository.getDashboard(storeId);

    case 'getRevenue':
      return PgAnalyticsRepository.getRevenue(storeId);

    case 'getPopularRecipes':
      return PgAnalyticsRepository.getPopularRecipes(storeId);

    case 'getOrderStats':
      return PgAnalyticsRepository.getOrderStats(storeId);

    case 'getCustomerFrequency':
      return PgAnalyticsRepository.getCustomerFrequency(storeId);

    case 'listCustomers': {
      const search = args['search'] as string | undefined;
      const customers = await PgCustomerRepository.findAll(storeId, search);
      return cap(customers);
    }

    case 'getCustomerDetails': {
      const customerId = args['customerId'] as number;
      return PgCustomerRepository.findById(customerId, storeId);
    }

    case 'listRecipes': {
      const search = args['search'] as string | undefined;
      const tag = args['tag'] as string | undefined;
      const recipes = await MongoRecipeRepository.findAll(storeId, { search, tag });
      return cap(recipes);
    }

    case 'listInventory': {
      const lowStockOnly = args['lowStockOnly'] as boolean | undefined;
      if (lowStockOnly) {
        const items = await PgInventoryRepository.findLowStock(storeId);
        return cap(items);
      }
      const search = args['search'] as string | undefined;
      const items = await PgInventoryRepository.findAll(storeId, search);
      return cap(items);
    }

    case 'getRecentOrders': {
      const status = args['status'] as number | undefined;
      const filters = status !== undefined ? { status: status as OrderStatus } : undefined;
      const orders = await PgOrderRepository.findAll(storeId, filters);
      return cap(orders);
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
