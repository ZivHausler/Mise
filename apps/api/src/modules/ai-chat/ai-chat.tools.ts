import type { FunctionDeclaration } from '@google/genai';
import { PgAnalyticsRepository } from '../analytics/analytics.repository.js';
import { PgCustomerRepository } from '../customers/customer.repository.js';
import { MongoRecipeRepository } from '../recipes/recipe.repository.js';
import { PgInventoryRepository } from '../inventory/inventory.repository.js';
import { PgOrderRepository } from '../orders/order.repository.js';
import type { OrderStatus } from '../orders/order.types.js';
import { PgPaymentRepository } from '../payments/payment.repository.js';
import { getPool } from '../../core/database/postgres.js';
import type { EntityReference, ToolCallResult } from './ai-chat.types.js';

const MAX_ITEMS = 50;

function cap<T>(items: T[]): T[] {
  return items.slice(0, MAX_ITEMS);
}

const ID_KEYS = new Set(['id', '_id', 'store_id', 'customer_id', 'recipe_id', 'order_id', 'user_id', 'ingredient_id', 'batch_id', 'payment_id', 'invitation_id']);

function stripIds(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(stripIds);
  if (data !== null && typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (ID_KEYS.has(k)) continue;
      out[k] = stripIds(v);
    }
    return out;
  }
  return data;
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
    description: 'Get full details for a specific customer by name, including order count and total spent.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The customer name to look up.' },
      },
      required: ['name'],
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
    name: 'getRecipeDetails',
    description: 'Get full details for a specific recipe by name, including all ingredients with quantities and units, steps, yield, cost, and selling price.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The recipe name to look up.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'searchRecipesByIngredient',
    description: 'Find recipes that use a specific ingredient by ingredient name.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        ingredientName: { type: 'string', description: 'The ingredient name to search for in recipes.' },
      },
      required: ['ingredientName'],
    },
  },
  {
    name: 'getSubRecipeUsage',
    description: 'Get a ranking of recipes by how often they are used as sub-recipes inside other recipes. Shows each sub-recipe name and the list of parent recipes that use it.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
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
    name: 'getOrderByNumber',
    description: 'Get full details for a specific order by its order number, including customer name, items, status, total amount, due date, and payment info.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        orderNumber: { type: 'number', description: 'The order number to look up (e.g. 100000014).' },
      },
      required: ['orderNumber'],
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
  {
    name: 'searchOrdersByRecipe',
    description: 'Find orders that contain a specific recipe/product by name. Returns matching orders with customer name, order number, status, and the quantity ordered.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        recipeName: { type: 'string', description: 'The recipe/product name to search for in orders.' },
      },
      required: ['recipeName'],
    },
  },
  {
    name: 'getUnpaidOrders',
    description: 'Get orders that have not been fully paid. Shows order number, customer name, total amount, amount paid so far, and remaining balance.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getPaidButNotDelivered',
    description: 'Get orders that have been paid but not yet delivered (status is not delivered). These are orders where money was collected but the customer is still waiting.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getOutstandingBalance',
    description: 'Get a summary of outstanding payments: total unpaid amount across all orders, number of unpaid orders, and a breakdown per customer showing how much each customer owes.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getRecentPayments',
    description: 'Get the most recent payment transactions, including amount, method (cash/credit_card), customer name, and order number.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', description: 'Optional filter by payment method: "cash" or "credit_card".', enum: ['cash', 'credit_card'] },
      },
      required: [],
    },
  },
];

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  storeId: number,
): Promise<ToolCallResult> {
  const raw = await executeToolCallRaw(name, args, storeId);
  const references = extractReferences(name, raw);
  const stripped = stripIds(raw);
  return { stripped, references };
}

const MAX_REFS_PER_TOOL = MAX_ITEMS;

function extractOrderRefsFromMapped(data: unknown): EntityReference[] {
  const items = Array.isArray(data) ? data : [];
  return items.slice(0, MAX_REFS_PER_TOOL).map((o) => ({
    type: 'order' as const,
    id: o.id,
    displayName: `#${o.orderNumber}`,
    subtitle: o.customer?.name ?? undefined,
    meta: o.status != null ? String(o.status) : undefined,
  }));
}

function extractOrderRefsFromRawSql(data: unknown): EntityReference[] {
  const items = Array.isArray(data) ? data : [];
  return items.slice(0, MAX_REFS_PER_TOOL).map((o) => ({
    type: 'order' as const,
    id: Number(o.id),
    displayName: `#${o.order_number}`,
    subtitle: o.customer_name ?? undefined,
    meta: o.status != null ? String(o.status) : undefined,
  }));
}

function extractCustomerRefs(data: unknown): EntityReference[] {
  const items = Array.isArray(data) ? data : [];
  return items.slice(0, MAX_REFS_PER_TOOL).map((c) => ({
    type: 'customer' as const,
    id: c.id,
    displayName: c.name,
    subtitle: c.phone ?? undefined,
  }));
}

function extractRecipeRefs(data: unknown): EntityReference[] {
  const items = Array.isArray(data) ? data : [];
  return items.slice(0, MAX_REFS_PER_TOOL).map((r) => ({
    type: 'recipe' as const,
    id: r.id,
    displayName: r.name,
    subtitle: undefined,
  }));
}

function extractInventoryRefs(data: unknown): EntityReference[] {
  const items = Array.isArray(data) ? data : [];
  return items.slice(0, MAX_REFS_PER_TOOL).map((i) => ({
    type: 'inventory' as const,
    id: i.id,
    displayName: i.name,
    subtitle: i.quantity != null && i.unit ? `${i.quantity} ${i.unit}` : undefined,
  }));
}

function extractReferences(toolName: string, rawResult: unknown): EntityReference[] {
  switch (toolName) {
    case 'getOrderByNumber': {
      const obj = rawResult as Record<string, unknown>;
      if (obj && obj['id'] && obj['order_number']) {
        return [{
          type: 'order',
          id: Number(obj['id']),
          displayName: `#${obj['order_number']}`,
          subtitle: (obj['customer_name'] as string) ?? undefined,
          meta: obj['status'] != null ? String(obj['status']) : undefined,
        }];
      }
      return [];
    }

    case 'getRecentOrders':
      return extractOrderRefsFromMapped(rawResult);

    case 'searchOrdersByRecipe':
    case 'getUnpaidOrders':
    case 'getPaidButNotDelivered':
      return extractOrderRefsFromRawSql(rawResult);

    case 'listCustomers':
      return extractCustomerRefs(rawResult);

    case 'getCustomerDetails': {
      // Single customer object (or error object)
      const obj = rawResult as Record<string, unknown>;
      if (obj && obj['id'] && obj['name']) {
        return [{
          type: 'customer',
          id: obj['id'] as number,
          displayName: obj['name'] as string,
          subtitle: (obj['phone'] as string) ?? undefined,
        }];
      }
      return [];
    }

    case 'getCustomerFrequency': {
      const items = Array.isArray(rawResult) ? rawResult : [];
      return items.slice(0, MAX_REFS_PER_TOOL).map((c) => ({
        type: 'customer' as const,
        id: Number(c.id),
        displayName: c.name as string,
        meta: `${c.order_count} orders`,
      }));
    }

    case 'getRecipeDetails': {
      const obj = rawResult as Record<string, unknown>;
      if (obj && obj['id'] && obj['name']) {
        return [{
          type: 'recipe',
          id: obj['id'] as string,
          displayName: obj['name'] as string,
        }];
      }
      return [];
    }

    case 'getSubRecipeUsage': {
      // Extract refs for the parent recipes that use sub-recipes
      const items = Array.isArray(rawResult) ? rawResult : [];
      const seen = new Set<string>();
      const refs: EntityReference[] = [];
      for (const item of items) {
        const usedIn = Array.isArray(item.usedIn) ? item.usedIn : [];
        for (const parent of usedIn) {
          if (parent.id && !seen.has(parent.id)) {
            seen.add(parent.id);
            refs.push({ type: 'recipe', id: parent.id, displayName: parent.name });
          }
          if (refs.length >= MAX_REFS_PER_TOOL) break;
        }
        if (refs.length >= MAX_REFS_PER_TOOL) break;
      }
      return refs;
    }

    case 'listRecipes':
    case 'searchRecipesByIngredient':
      return extractRecipeRefs(rawResult);

    case 'listInventory':
      return extractInventoryRefs(rawResult);

    default:
      return [];
  }
}

async function executeToolCallRaw(
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
      const name = args['name'] as string;
      const customers = await PgCustomerRepository.findAll(storeId, name);
      return customers[0] ?? { error: 'Customer not found' };
    }

    case 'listRecipes': {
      const search = args['search'] as string | undefined;
      const tag = args['tag'] as string | undefined;
      const recipes = await MongoRecipeRepository.findAll(storeId, { search, tag });
      return cap(recipes);
    }

    case 'getRecipeDetails': {
      const recipeName = args['name'] as string;
      const recipes = await MongoRecipeRepository.findAll(storeId, { search: recipeName });
      const recipe = recipes[0];
      if (!recipe) return { error: 'Recipe not found' };

      // Resolve sub-recipes referenced in steps
      const subRecipeSteps = recipe.steps.filter((s) => s.type === 'sub_recipe' && s.recipeId);
      const resolvedSubRecipes: { name: string; ingredients: unknown; steps: unknown; totalDurationMinutes: number }[] = [];
      if (subRecipeSteps.length > 0) {
        const subRecipes = await Promise.all(
          subRecipeSteps.map((s) => MongoRecipeRepository.findById(storeId, s.recipeId!)),
        );
        for (const sr of subRecipes) {
          if (!sr) continue;
          const subDuration = sr.steps.reduce((sum, s) => sum + (s.duration ?? 0), 0);
          resolvedSubRecipes.push({ name: sr.name, ingredients: sr.ingredients, steps: sr.steps, totalDurationMinutes: subDuration });
        }
        (recipe as unknown as Record<string, unknown>)['subRecipes'] = resolvedSubRecipes;
      }

      // Compute total duration including sub-recipes
      const mainDuration = recipe.steps.reduce((sum, s) => sum + (s.duration ?? 0), 0);
      const subDuration = resolvedSubRecipes.reduce((sum, sr) => sum + sr.totalDurationMinutes, 0);
      (recipe as unknown as Record<string, unknown>)['totalDurationMinutes'] = mainDuration + subDuration;

      return recipe;
    }

    case 'searchRecipesByIngredient': {
      const ingredientName = args['ingredientName'] as string;
      const allRecipes = await MongoRecipeRepository.findAll(storeId);
      const escapedName = ingredientName.toLowerCase();
      const matched = allRecipes.filter((r) =>
        r.ingredients.some((i) => i.name.toLowerCase().includes(escapedName)),
      );
      return cap(matched);
    }

    case 'getSubRecipeUsage': {
      const allRecipes = await MongoRecipeRepository.findAll(storeId);
      const recipeMap = new Map(allRecipes.map((r) => [r.id, r.name]));
      const usage: Record<string, { id: string; name: string; usedIn: { id: string; name: string }[]; count: number }> = {};

      for (const recipe of allRecipes) {
        for (const step of recipe.steps) {
          if (step.type === 'sub_recipe' && step.recipeId) {
            const subId = step.recipeId;
            if (!usage[subId]) {
              usage[subId] = { id: subId, name: recipeMap.get(subId) ?? 'Unknown', usedIn: [], count: 0 };
            }
            usage[subId].usedIn.push({ id: recipe.id, name: recipe.name });
            usage[subId].count++;
          }
        }
      }

      return Object.values(usage).sort((a, b) => b.count - a.count);
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

    case 'getOrderByNumber': {
      const orderNumber = args['orderNumber'] as number;
      const pool = getPool();
      const result = await pool.query(
        `SELECT o.*, c.name as customer_name
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.store_id = $1 AND o.order_number = $2`,
        [storeId, orderNumber],
      );
      if (!result.rows[0]) return { error: 'Order not found' };
      const row = result.rows[0];
      const items = typeof row['items'] === 'string' ? JSON.parse(row['items']) : row['items'];
      return {
        id: row['id'],
        order_number: row['order_number'],
        customer_name: row['customer_name'],
        items,
        status: row['status'],
        total_amount: row['total_amount'],
        notes: row['notes'],
        due_date: row['due_date'],
        created_at: row['created_at'],
      };
    }

    case 'getRecentOrders': {
      const status = args['status'] as number | undefined;
      const filters = status !== undefined ? { status: status as OrderStatus } : undefined;
      const orders = await PgOrderRepository.findAll(storeId, filters);
      return cap(orders);
    }

    case 'searchOrdersByRecipe': {
      const recipeName = args['recipeName'] as string;
      // First find matching recipe IDs by name
      const recipes = await MongoRecipeRepository.findAll(storeId, { search: recipeName });
      if (recipes.length === 0) return [];
      const recipeIds = recipes.map((r) => r.id);
      // Search orders whose items JSONB contains any of these recipe IDs
      const pool = getPool();
      const result = await pool.query(
        `SELECT o.id, o.order_number, c.name as customer_name, o.items, o.status, o.total_amount, o.created_at
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.store_id = $1
           AND EXISTS (
             SELECT 1 FROM jsonb_array_elements(o.items::jsonb) elem
             WHERE elem->>'recipeId' = ANY($2)
           )
         ORDER BY o.created_at DESC
         LIMIT 50`,
        [storeId, recipeIds],
      );
      // Map rows to include matched item quantities
      return result.rows.map((row: Record<string, unknown>) => {
        const items = (typeof row['items'] === 'string' ? JSON.parse(row['items']) : row['items']) as Array<{ recipeId: string; recipeName?: string; quantity: number }>;
        const matched = items.filter((i) => recipeIds.includes(i.recipeId));
        return {
          id: row['id'],
          order_number: row['order_number'],
          customer_name: row['customer_name'],
          status: row['status'],
          total_amount: row['total_amount'],
          created_at: row['created_at'],
          matched_items: matched.map((i) => ({ name: i.recipeName ?? recipeName, quantity: i.quantity })),
        };
      });
    }

    case 'getUnpaidOrders': {
      const pool = getPool();
      const result = await pool.query(
        `SELECT o.id, o.order_number, c.name as customer_name, o.total_amount,
                COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as paid_amount,
                o.total_amount - COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as remaining,
                o.status, o.created_at
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         LEFT JOIN payments p ON p.order_id = o.id
         WHERE o.store_id = $1
         GROUP BY o.id, o.order_number, c.name, o.total_amount, o.status, o.created_at
         HAVING o.total_amount > COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0)
         ORDER BY remaining DESC
         LIMIT 50`,
        [storeId],
      );
      return result.rows;
    }

    case 'getPaidButNotDelivered': {
      const pool = getPool();
      const result = await pool.query(
        `SELECT o.id, o.order_number, c.name as customer_name, o.total_amount, o.status, o.created_at, o.due_date,
                COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as paid_amount
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         LEFT JOIN payments p ON p.order_id = o.id
         WHERE o.store_id = $1 AND o.status != 3
         GROUP BY o.id, o.order_number, c.name, o.total_amount, o.status, o.created_at, o.due_date
         HAVING COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) >= o.total_amount
         ORDER BY o.created_at ASC
         LIMIT 50`,
        [storeId],
      );
      return result.rows;
    }

    case 'getOutstandingBalance': {
      const pool = getPool();
      const result = await pool.query(
        `SELECT c.name as customer_name,
                COUNT(o.id) as unpaid_orders,
                SUM(o.total_amount - COALESCE(paid.amount, 0)) as total_owed
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         LEFT JOIN (
           SELECT order_id, SUM(amount) as amount
           FROM payments WHERE status = 'completed'
           GROUP BY order_id
         ) paid ON paid.order_id = o.id
         WHERE o.store_id = $1 AND o.total_amount > COALESCE(paid.amount, 0)
         GROUP BY c.name
         ORDER BY total_owed DESC`,
        [storeId],
      );
      const totalOwed = result.rows.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r['total_owed']), 0);
      const totalUnpaidOrders = result.rows.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r['unpaid_orders']), 0);
      return {
        totalOutstanding: totalOwed,
        totalUnpaidOrders,
        byCustomer: result.rows,
      };
    }

    case 'getRecentPayments': {
      const method = args['method'] as string | undefined;
      const filters = method ? { method } : undefined;
      const result = await PgPaymentRepository.findAll(storeId, { limit: 30, offset: 0 }, filters);
      return result.items;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
