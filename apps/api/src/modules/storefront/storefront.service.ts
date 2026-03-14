import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';
import { PgStoreRepository } from '../stores/store.repository.js';
import { MongoRecipeRepository } from '../recipes/recipe.repository.js';
import { getPool } from '../../core/database/postgres.js';
import { CustomerCrud } from '../customers/customerCrud.js';
import { OrderCrud } from '../orders/orderCrud.js';
import { PaymentCrud } from '../payments/paymentCrud.js';
import { PAYMENT_METHOD } from '../payments/payment.types.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { isTierFeatureEnabled } from '../../core/middleware/requireTier.js';
import { PayPalOrdersService } from './paypal-orders.service.js';
import { env } from '../../config/env.js';
import type { z } from 'zod';
import type { createOrderSchema } from './storefront.schemas.js';
import { ORDER_STATUS } from '../orders/order.types.js';
import { OrderService } from '../orders/order.service.js';
import { PgOrderNotificationRepository } from '../orders/order-notification.repository.js';

export class StorefrontService {
  constructor(
    private paypalOrders: PayPalOrdersService,
    private orderService: OrderService,
  ) {}

  // -- Store slug resolution --

  private async resolveStoreBySlug(slug: string): Promise<{ id: number; name: string; nameEn: string | null; theme: string; address: string | null; phone: string | null; storefrontEnabled: boolean; applyThemeToApp: boolean; logoUrl: string | null; bannerUrl: string | null; description: string | null; descriptionEn: string | null; categorySubject: string | null }> {
    const store = await PgStoreRepository.findBySlug(slug);
    if (!store) throw new NotFoundError('Store not found', ErrorCode.STORE_NOT_FOUND);

    return {
      id: store.id,
      name: store.name,
      nameEn: store.nameEn,
      theme: store.theme,
      address: store.address,
      phone: store.phone,
      storefrontEnabled: store.storefrontEnabled,
      applyThemeToApp: store.applyThemeToApp,
      logoUrl: store.logoUrl,
      bannerUrl: store.bannerUrl,
      description: store.description,
      descriptionEn: store.descriptionEn,
      categorySubject: store.categorySubject ?? null,
    };
  }

  private async requireStorefront(slug: string) {
    const store = await this.resolveStoreBySlug(slug);
    if (!store.storefrontEnabled) {
      throw new NotFoundError('Store not found', ErrorCode.STORE_NOT_FOUND);
    }
    // Check subscription tier — storefront requires 'orders' feature (Basic+)
    const hasFeature = await isTierFeatureEnabled('orders', store.id);
    if (!hasFeature) {
      throw new NotFoundError('Store not found', ErrorCode.STORE_NOT_FOUND);
    }
    return store;
  }

  // -- Public endpoints --

  async discoverStores(lang: 'he' | 'en' = 'he') {
    const pool = getPool();
    const nameExpr = lang === 'en' ? 'COALESCE(s.name_en, s.name)' : 's.name';
    const descExpr = lang === 'en' ? 'COALESCE(s.description_en, s.description)' : 's.description';
    const result = await pool.query(
      `SELECT s.slug, ${nameExpr} AS name, ${descExpr} AS description,
              s.logo_url, s.banner_url, s.theme,
              s.category_subject, s.category_sub_subject
       FROM stores s
       WHERE s.storefront_enabled = true
       ORDER BY s.name ASC
       LIMIT 50`,
    );
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      slug: row['slug'] as string,
      name: row['name'] as string,
      description: (row['description'] as string) ?? null,
      logoUrl: (row['logo_url'] as string) ?? null,
      bannerUrl: (row['banner_url'] as string) ?? null,
      theme: (row['theme'] as string) ?? 'cream',
      categorySubject: (row['category_subject'] as string) ?? null,
      categorySubSubject: (row['category_sub_subject'] as string) ?? null,
    }));
  }

  async getStoreBySlug(slug: string, lang: 'he' | 'en' = 'he') {
    const store = await this.requireStorefront(slug);
    const name = lang === 'en' ? (store.nameEn ?? store.name) : store.name;
    const description = lang === 'en' ? (store.descriptionEn ?? store.description) : store.description;
    return {
      name,
      slug,
      theme: store.theme,
      applyThemeToApp: store.applyThemeToApp,
      address: store.address,
      phone: store.phone,
      logoUrl: store.logoUrl,
      bannerUrl: store.bannerUrl,
      description,
      categorySubject: store.categorySubject ?? null,
    };
  }

  async getPublishedMenu(slug: string, filters?: { tag?: string; search?: string; lang?: 'he' | 'en' }) {
    const lang = filters?.lang ?? 'he';
    const store = await this.requireStorefront(slug);

    // Run recipe query and tag name map query in parallel (both only depend on store)
    const [recipes, tagNameMap] = await Promise.all([
      MongoRecipeRepository.findPublished(store.id, filters),
      this.getTagNameMap(store.id, lang),
    ]);

    // Collect all ingredient IDs across all recipes
    const ingredientIds = new Set<number>();
    for (const r of recipes) {
      for (const ing of r.ingredients ?? []) {
        const id = Number(ing.ingredientId);
        if (id) ingredientIds.add(id);
      }
    }

    // Batch-fetch allergens for all ingredients in one query (depends on recipe results)
    type AllergenInfo = { name: string; nameEn: string | null; icon: string | null; color: string | null };
    const allergensByIngredient = new Map<number, AllergenInfo[]>();
    if (ingredientIds.size > 0) {
      const pool = getPool();
      const result = await pool.query(
        `SELECT ia.ingredient_id, a.name, a.name_en, a.icon, a.color
         FROM ingredient_allergens ia
         JOIN allergens a ON a.id = ia.allergen_id
         WHERE ia.ingredient_id = ANY($1)`,
        [Array.from(ingredientIds)],
      );
      for (const row of result.rows as Record<string, unknown>[]) {
        const iid = Number(row['ingredient_id']);
        if (!allergensByIngredient.has(iid)) allergensByIngredient.set(iid, []);
        allergensByIngredient.get(iid)!.push({
          name: row['name'] as string,
          nameEn: (row['name_en'] as string) ?? null,
          icon: (row['icon'] as string) || null,
          color: (row['color'] as string) || null,
        });
      }
    }

    return recipes.map((r) => {
      // Deduplicate allergens by name for this recipe
      const allergenMap = new Map<string, AllergenInfo>();
      for (const ing of r.ingredients ?? []) {
        const allergens = allergensByIngredient.get(Number(ing.ingredientId));
        if (allergens) {
          for (const a of allergens) {
            if (!allergenMap.has(a.name)) allergenMap.set(a.name, a);
          }
        }
      }

      const resolvedName = lang === 'en' ? (r.nameEn ?? r.name) : r.name;
      const resolvedDescription = lang === 'en' ? (r.descriptionEn ?? r.description) : r.description;

      return {
        id: r.id,
        name: resolvedName,
        description: resolvedDescription,
        sellingPrice: r.sellingPrice ?? 0,
        photos: r.photos ?? [],
        tags: (r.tags ?? []).map((t) => tagNameMap.get(t) ?? t),
        allergens: Array.from(allergenMap.values()).map((a) => ({
          name: lang === 'en' ? (a.nameEn ?? a.name) : a.name,
          icon: a.icon,
          color: a.color,
        })),
      };
    });
  }

  async getRecipeDetail(slug: string, recipeId: string, lang: 'he' | 'en' = 'he') {
    const store = await this.requireStorefront(slug);
    const recipe = await MongoRecipeRepository.findById(store.id, recipeId);
    if (!recipe || !recipe.isPublished) {
      throw new NotFoundError('Recipe not found');
    }

    // Fetch allergens for this recipe's ingredients
    const ingredientIds = (recipe.ingredients ?? []).map((i) => Number(i.ingredientId)).filter(Boolean);
    const allergenMap = new Map<string, { name: string; nameEn: string | null; icon: string | null; color: string | null }>();
    if (ingredientIds.length > 0) {
      const pool = getPool();
      const result = await pool.query(
        `SELECT DISTINCT a.name, a.name_en, a.icon, a.color
         FROM ingredient_allergens ia
         JOIN allergens a ON a.id = ia.allergen_id
         WHERE ia.ingredient_id = ANY($1)`,
        [ingredientIds],
      );
      for (const row of result.rows as Record<string, unknown>[]) {
        const name = row['name'] as string;
        if (!allergenMap.has(name)) {
          allergenMap.set(name, {
            name,
            nameEn: (row['name_en'] as string) ?? null,
            icon: (row['icon'] as string) || null,
            color: (row['color'] as string) || null,
          });
        }
      }
    }

    const resolvedName = lang === 'en' ? (recipe.nameEn ?? recipe.name) : recipe.name;
    const resolvedDescription = lang === 'en' ? (recipe.descriptionEn ?? recipe.description) : recipe.description;
    const tagNameMap = await this.getTagNameMap(store.id, lang);

    return {
      id: recipe.id,
      name: resolvedName,
      description: resolvedDescription,
      sellingPrice: recipe.sellingPrice ?? 0,
      photos: recipe.photos ?? [],
      tags: (recipe.tags ?? []).map((t) => tagNameMap.get(t) ?? t),
      allergens: Array.from(allergenMap.values()).map((a) => ({
        name: lang === 'en' ? (a.nameEn ?? a.name) : a.name,
        icon: a.icon,
        color: a.color,
      })),
      ingredients: await this.resolveIngredientNames(recipe.ingredients ?? [], lang),
    };
  }

  /**
   * Build a map from Hebrew tag name → resolved tag name based on lang.
   * When lang=en, maps Hebrew names to English (falling back to Hebrew if no translation).
   * When lang=he, returns identity mapping (no-op).
   */
  private async getTagNameMap(storeId: number, lang: 'he' | 'en'): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (lang !== 'en') return map;

    const pool = getPool();
    const result = await pool.query(
      `SELECT name, name_en FROM recipe_tags WHERE store_id = $1 AND name_en IS NOT NULL`,
      [storeId],
    );
    for (const row of result.rows as Record<string, unknown>[]) {
      map.set(row['name'] as string, (row['name_en'] as string) ?? (row['name'] as string));
    }
    return map;
  }

  private async resolveIngredientNames(
    ingredients: Array<{ ingredientId?: string | number; name: string; quantity?: number; unit?: string }>,
    lang: 'he' | 'en',
  ): Promise<Array<{ name: string }>> {
    if (lang !== 'en' || ingredients.length === 0) {
      return ingredients.map((i) => ({ name: i.name }));
    }

    // Batch-fetch English names from PostgreSQL
    const ids = ingredients.map((i) => Number(i.ingredientId)).filter(Boolean);
    if (ids.length === 0) {
      return ingredients.map((i) => ({ name: i.name }));
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, name_en FROM ingredients WHERE id = ANY($1)`,
      [ids],
    );

    const nameMap = new Map<number, string>();
    for (const row of result.rows as Record<string, unknown>[]) {
      const id = Number(row['id']);
      const nameEn = row['name_en'] as string | null;
      const name = row['name'] as string;
      nameMap.set(id, nameEn ?? name);
    }

    return ingredients.map((i) => {
      const id = Number(i.ingredientId);
      return { name: id && nameMap.has(id) ? nameMap.get(id)! : i.name };
    });
  }

  async createStorefrontOrder(slug: string, data: z.infer<typeof createOrderSchema>, authenticatedCustomerId?: number) {
    const store = await this.requireStorefront(slug);

    // 1. Resolve or create customer_stores row
    let customer;
    if (authenticatedCustomerId) {
      // Authenticated user: find or create customer_stores row for this store
      customer = await this.findOrCreateCustomerStore(
        store.id,
        authenticatedCustomerId,
        data.customer,
      );
    } else {
      // Guest or unauthenticated: resolve by phone
      customer = await CustomerCrud.findByPhone(store.id, data.customer.phone);
      if (!customer) {
        customer = await CustomerCrud.create(store.id, {
          name: data.customer.name,
          phone: data.customer.phone,
          email: data.customer.email || undefined,
        });
      }
    }

    // 2. Validate and resolve recipe items (batch fetch to avoid N+1)
    const recipeIds = data.items.map((item) => item.recipeId);
    const recipes = await MongoRecipeRepository.findByIds(store.id, recipeIds);
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    const items: { recipeId: string; quantity: number; unitPrice: number; recipeName: string; notes?: string }[] = [];
    let totalAmount = 0;
    for (const item of data.items) {
      const recipe = recipeMap.get(item.recipeId);
      if (!recipe || !recipe.isPublished || !recipe.sellingPrice) {
        throw new ValidationError(`Recipe ${item.recipeId} is not available`);
      }
      const unitPrice = recipe.sellingPrice;
      items.push({
        recipeId: item.recipeId,
        quantity: item.quantity,
        unitPrice,
        recipeName: recipe.name,
        notes: item.notes,
      });
      totalAmount += unitPrice * item.quantity;
    }

    // 3. If PayPal, capture payment BEFORE creating the DB order
    let paypalTransactionId: string | undefined;
    if (data.paymentMethod === 'paypal') {
      if (!data.paypalOrderId) {
        throw new ValidationError('paypalOrderId is required for PayPal payments');
      }
      const capture = await this.paypalOrders.captureOrder(data.paypalOrderId);
      if (capture.status !== 'COMPLETED') {
        throw new ValidationError('PayPal payment was not completed');
      }
      const capturedAmount = parseFloat(capture.amount.value);
      if (capturedAmount !== totalAmount) {
        throw new ValidationError(
          `Payment amount mismatch: expected ${totalAmount}, got ${capturedAmount}`,
        );
      }
      paypalTransactionId = capture.transactionId;
    }

    // 4. Create order via OrderCrud with source='storefront'
    const orderStatus = data.paymentMethod === 'paypal'
      ? ORDER_STATUS.RECEIVED  // PayPal paid — skip PENDING_APPROVAL
      : ORDER_STATUS.PENDING_APPROVAL;
    const order = await OrderCrud.createWithSource(store.id, {
      customerId: customer.id,
      items: data.items.map((item, idx) => ({
        recipeId: item.recipeId,
        quantity: item.quantity,
        unitPrice: items[idx]!.unitPrice,
        recipeName: items[idx]!.recipeName,
        notes: item.notes,
      })),
      notes: data.notes,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      totalAmount,
    }, 'storefront', orderStatus);

    // 5. Record PayPal payment if applicable
    if (paypalTransactionId) {
      await PaymentCrud.create(store.id, {
        orderId: order.id,
        amount: totalAmount,
        method: PAYMENT_METHOD.PAYPAL,
        notes: `PayPal Transaction: ${paypalTransactionId}`,
      });
    }

    // 6. Fire order.created event
    await getEventBus().publish({
      eventName: EventNames.ORDER_CREATED,
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        total: totalAmount,
        storeId: store.id,
        source: 'storefront',
        items: items.map((i) => ({
          name: i.recipeName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      },
      timestamp: new Date(),
    });

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount,
      items: items.map((i) => ({
        name: i.recipeName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      dueDate: data.dueDate ?? null,
      paymentStatus: (data.paymentMethod === 'paypal' ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
    };
  }

  /**
   * Find or create a customer_stores row linking a global customer to a store.
   */
  private async findOrCreateCustomerStore(
    storeId: number,
    globalCustomerId: number,
    customerData: { name: string; phone: string; email?: string },
  ) {
    const pool = getPool();

    // Check if link already exists
    const existing = await pool.query(
      'SELECT * FROM customer_stores WHERE customer_id = $1 AND store_id = $2',
      [globalCustomerId, storeId],
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      // Update phone/name if changed
      if (row['phone'] !== customerData.phone || row['name'] !== customerData.name) {
        return CustomerCrud.update(Number(row['id']), storeId, {
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
        });
      }
      return CustomerCrud.getById(Number(row['id']), storeId) as Promise<NonNullable<Awaited<ReturnType<typeof CustomerCrud.getById>>>>;
    }

    // Create new customer_stores row linked to global customer
    const result = await pool.query(
      `INSERT INTO customer_stores (store_id, customer_id, name, phone, email, loyalty_enabled, loyalty_tier, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, 'bronze', NOW(), NOW())
       RETURNING *`,
      [storeId, globalCustomerId, customerData.name, customerData.phone, customerData.email ?? null],
    );
    // Return via CustomerCrud to get properly mapped object
    return CustomerCrud.getById(Number(result.rows[0]['id']), storeId) as Promise<NonNullable<Awaited<ReturnType<typeof CustomerCrud.getById>>>>;
  }

  async getOrderStatus(slug: string, orderNumber: number, phone: string) {
    const store = await this.requireStorefront(slug);

    const order = await OrderCrud.findByOrderNumber(store.id, orderNumber);
    if (!order) throw new NotFoundError('Order not found');

    // Verify phone matches the customer
    if (order.customer.id != null) {
      const customer = await CustomerCrud.getById(order.customer.id, store.id);
      if (!customer || customer.phone !== phone) {
        throw new NotFoundError('Order not found');
      }
    }

    const unreadNotifications = await PgOrderNotificationRepository.countUnreadByOrderId(order.id);

    // Fetch recipe photos for order items
    const recipeIds = order.items.map((i: any) => i.recipeId).filter(Boolean);
    const recipes = recipeIds.length > 0 ? await MongoRecipeRepository.findByIds(store.id, recipeIds) : [];
    const photoMap = new Map(recipes.map((r) => [r.id, r.photos?.[0] ?? null]));

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      previousStatus: order.previousStatus,
      cancellationReason: order.cancellationReason,
      items: order.items.map((i: any) => ({
        recipeId: i.recipeId,
        name: i.recipeName || i.recipeId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        photo: photoMap.get(i.recipeId) ?? null,
      })),
      totalAmount: order.totalAmount,
      dueDate: order.dueDate?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      unreadNotifications,
    };
  }

  async createPayPalOrderOnly(slug: string, items: { recipeId: string; quantity: number }[]) {
    const store = await this.requireStorefront(slug);

    // Validate items and calculate total (no DB order created)
    const recipeIds = items.map((item) => item.recipeId);
    const recipes = await MongoRecipeRepository.findByIds(store.id, recipeIds);
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    let totalAmount = 0;
    for (const item of items) {
      const recipe = recipeMap.get(item.recipeId);
      if (!recipe || !recipe.isPublished || !recipe.sellingPrice) {
        throw new ValidationError(`Recipe ${item.recipeId} is not available`);
      }
      totalAmount += recipe.sellingPrice * item.quantity;
    }

    const paypalResult = await this.paypalOrders.createOrder(
      totalAmount,
      'ILS',
      `Order from ${store.name}`,
      slug,
    );

    return {
      paypalOrderId: paypalResult.paypalOrderId,
      approvalUrl: paypalResult.approvalUrl,
      totalAmount,
    };
  }

  async capturePayPalOrder(slug: string, paypalOrderId: string, orderNumber: number) {
    const store = await this.requireStorefront(slug);

    // HIGH-1: Verify the order belongs to this store
    const order = await OrderCrud.findByOrderNumber(store.id, orderNumber);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const capture = await this.paypalOrders.captureOrder(paypalOrderId);

    // Verify captured amount matches order total
    if (capture.status === 'COMPLETED') {
      const capturedAmount = parseFloat(capture.amount.value);
      if (capturedAmount !== order.totalAmount) {
        throw new ValidationError(
          `Payment amount mismatch: expected ${order.totalAmount}, got ${capturedAmount}`,
        );
      }

      await PaymentCrud.create(store.id, {
        orderId: order.id,
        amount: capturedAmount,
        method: PAYMENT_METHOD.PAYPAL,
        notes: `PayPal Transaction: ${capture.transactionId}`,
      });
    }

    return { status: capture.status, transactionId: capture.transactionId };
  }

  async getPayPalCheckoutHtml(slug: string, paypalOrderId: string, amount: string) {
    await this.requireStorefront(slug);
    return generatePayPalCheckoutHtml(paypalOrderId, amount, slug);
  }

  async cancelStorefrontOrder(slug: string, orderNumber: number, phone: string, reason?: string) {
    const store = await this.requireStorefront(slug);
    const order = await OrderCrud.findByOrderNumber(store.id, orderNumber);
    if (!order) throw new NotFoundError('Order not found');

    // Verify phone matches the customer
    if (order.customer.id != null) {
      const customer = await CustomerCrud.getById(order.customer.id, store.id);
      if (!customer || customer.phone !== phone) {
        throw new NotFoundError('Order not found');
      }
    }

    // PENDING_APPROVAL -> direct cancel
    if (order.status === ORDER_STATUS.PENDING_APPROVAL) {
      return this.orderService.cancelOrder(store.id, order.id, reason, 'customer');
    }

    // RECEIVED/IN_PROGRESS/READY -> request cancellation
    if (([ORDER_STATUS.RECEIVED, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.READY] as number[]).includes(order.status)) {
      return this.orderService.requestCancellation(store.id, order.id, reason);
    }

    throw new ValidationError('Cannot cancel order in current status');
  }

  async getOrderNotifications(slug: string, orderNumber: number, phone: string) {
    const store = await this.requireStorefront(slug);
    const order = await OrderCrud.findByOrderNumber(store.id, orderNumber);
    if (!order) throw new NotFoundError('Order not found');

    // Verify phone matches the customer
    if (order.customer.id != null) {
      const customer = await CustomerCrud.getById(order.customer.id, store.id);
      if (!customer || customer.phone !== phone) {
        throw new NotFoundError('Order not found');
      }
    }

    const notifications = await PgOrderNotificationRepository.findByOrderId(order.id);

    // Mark all as read
    await PgOrderNotificationRepository.markAllReadByOrderId(order.id);

    return notifications.map((n) => ({
      id: n.id,
      statusFrom: n.statusFrom,
      statusTo: n.statusTo,
      message: n.message,
      createdAt: n.createdAt.toISOString(),
    }));
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generatePayPalCheckoutHtml(paypalOrderId: string, amount: string, slug: string): string {
  // Validate orderId format as an extra safety layer
  if (!/^[A-Z0-9]+$/i.test(paypalOrderId)) {
    throw new ValidationError('Invalid PayPal order ID format');
  }
  const safeAmount = escapeHtml(amount);

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #FDF8F3;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 20px;
      -webkit-font-smoothing: antialiased;
    }
    #paypal-container { width: 100%; max-width: 400px; }
    .amount-section { text-align: center; margin-bottom: 32px; }
    .amount-label { font-size: 14px; color: #8B7355; margin-bottom: 8px; font-weight: 500; }
    .amount-value { font-size: 36px; font-weight: 700; color: #2D2014; letter-spacing: -0.5px; }
    .amount-currency { font-size: 20px; font-weight: 500; color: #8B7355; margin-right: 4px; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #C4823E40, transparent); margin-bottom: 28px; }
    .choose-label { font-size: 14px; color: #8B7355; text-align: center; margin-bottom: 16px; font-weight: 500; }
    #buttons-container { min-height: 48px; }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0; }
    .spinner { width: 32px; height: 32px; border: 3px solid #C4823E20; border-top-color: #C4823E; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { font-size: 14px; color: #8B7355; }
    .secure-badge { display: inline-flex; align-items: center; justify-content: center; gap: 6px; margin-top: 24px; font-size: 12px; color: #A0937D; width: 100%; }
    .error-state { display: none; text-align: center; padding: 24px 20px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 16px; margin-top: 16px; }
    .error-icon { font-size: 32px; margin-bottom: 12px; }
    .error-text { font-size: 15px; color: #991B1B; margin-bottom: 16px; line-height: 1.4; }
    .retry-btn { font-size: 15px; color: #fff; background: #C4823E; border: none; border-radius: 10px; padding: 12px 32px; cursor: pointer; font-weight: 600; font-family: inherit; }
  </style>
</head>
<body>
  <div id="paypal-container">
    <div class="amount-section">
      <div class="amount-label">\u05E1\u05DB\u05D5\u05DD \u05DC\u05EA\u05E9\u05DC\u05D5\u05DD</div>
      <div class="amount-value"><span class="amount-currency">&#8362;</span>${safeAmount}</div>
    </div>
    <div class="divider"></div>
    <div class="choose-label">\u05D1\u05D7\u05E8\u05D5 \u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD</div>
    <div id="loading" class="loading-state">
      <div class="spinner"></div>
      <div class="loading-text">\u05D8\u05D5\u05E2\u05DF...</div>
    </div>
    <div id="buttons-container"></div>
    <div id="error-state" class="error-state">
      <div class="error-icon">\u26A0\uFE0F</div>
      <div class="error-text">\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05D0\u05EA \u05D0\u05DE\u05E6\u05E2\u05D9 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD.<br>\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.</div>
      <button class="retry-btn" onclick="location.reload()">\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1</button>
    </div>
    <div class="secure-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      \u05EA\u05E9\u05DC\u05D5\u05DD \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7
    </div>
  </div>
  <script src="https://www.paypal.com/sdk/js?client-id=${env.PAYPAL_CLIENT_ID}&currency=ILS&locale=he_IL&enable-funding=card"
    onload="initPayPal()" onerror="showError()"></script>
  <script>
    function showError() {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error-state').style.display = 'block';
    }
    function initPayPal() {
      document.getElementById('loading').style.display = 'none';
      paypal.Buttons({
        style: { layout: 'vertical', shape: 'pill', height: 48 },
        createOrder: function() { return ${JSON.stringify(paypalOrderId)}; },
        onApprove: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYPAL_APPROVED',
            paypalOrderId: data.orderID,
          }));
        },
        onCancel: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYPAL_CANCELLED' }));
        },
        onError: function(err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYPAL_ERROR',
            error: err.toString(),
          }));
        },
      }).render('#buttons-container');
    }
  </script>
</body>
</html>`;
}
