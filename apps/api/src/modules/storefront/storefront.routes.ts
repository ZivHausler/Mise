import type { FastifyInstance } from 'fastify';
import { StorefrontController } from './storefront.controller.js';
import { StorefrontService } from './storefront.service.js';
import { StorefrontAuthService } from './storefront-auth.service.js';
import { PayPalOrdersService } from './paypal-orders.service.js';
import { OrderService } from '../orders/order.service.js';
import { sseManager } from '../../core/sse/sse-manager.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { OrderCrud } from '../orders/orderCrud.js';
import { getPool } from '../../core/database/postgres.js';

export default async function storefrontRoutes(app: FastifyInstance) {
  const paypalOrdersService = new PayPalOrdersService();
  const orderService = new OrderService(undefined, undefined, paypalOrdersService);
  const service = new StorefrontService(paypalOrdersService, orderService);
  const authService = new StorefrontAuthService(app);
  const controller = new StorefrontController(service);
  controller.setAuthService(authService);

  // All routes are public — NO authMiddleware
  // Rate limiting applied per-route (stricter than auth endpoints)

  // Auth: Google sign-in
  app.post('/s/auth/google', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, (req, reply) => controller.authenticateWithGoogle(req, reply));

  // Auth: validate token / get profile
  app.get('/s/auth/me', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, (req, reply) => controller.getAuthProfile(req, reply));

  // Auth: update profile (firstName, lastName, phone)
  app.put('/s/auth/profile', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, (req, reply) => controller.updateProfile(req, reply));

  // Store discovery — must come BEFORE /:slug to avoid param capture
  app.get<{ Querystring: { lang?: string } }>('/s/discover', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, (req, reply) => controller.discoverStores(req, reply));

  // Store info
  app.get<{ Params: { slug: string }; Querystring: { lang?: string } }>('/s/:slug', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, (req, reply) => controller.getStoreInfo(req, reply));

  // Menu (all published recipes)
  app.get<{ Params: { slug: string }; Querystring: { tag?: string; search?: string; lang?: string } }>('/s/:slug/menu', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, (req, reply) => controller.getMenu(req, reply));

  // Single recipe detail
  app.get<{ Params: { slug: string; recipeId: string }; Querystring: { lang?: string } }>('/s/:slug/menu/:recipeId', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
  }, (req, reply) => controller.getRecipeDetail(req, reply));

  // Create order
  app.post<{ Params: { slug: string } }>('/s/:slug/orders', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, (req, reply) => controller.createOrder(req, reply));

  // Get order status (requires phone for verification)
  app.get<{ Params: { slug: string; orderNumber: string }; Querystring: { phone: string } }>('/s/:slug/orders/:orderNumber', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, (req, reply) => controller.getOrderStatus(req, reply));

  // PayPal: create PayPal order only (no DB order) — for pre-approval flow
  app.post<{ Params: { slug: string } }>('/s/:slug/payments/paypal-order', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, (req, reply) => controller.createPayPalOrder(req, reply));

  // PayPal: capture payment
  app.post<{ Params: { slug: string } }>('/s/:slug/payments/capture', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, (req, reply) => controller.capturePayPalOrder(req, reply));

  // PayPal: checkout page (serves minimal HTML with PayPal JS SDK)
  app.get<{ Params: { slug: string }; Querystring: { orderId: string; amount: string } }>('/s/:slug/payments/checkout', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, (req, reply) => controller.getPayPalCheckoutPage(req, reply));

  // Cancel order (customer-initiated)
  app.post<{ Params: { slug: string; orderNumber: string } }>('/s/:slug/orders/:orderNumber/cancel', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, (req, reply) => controller.cancelOrder(req, reply));

  // Get order notifications
  app.get<{ Params: { slug: string; orderNumber: string }; Querystring: { phone: string } }>(
    '/s/:slug/orders/:orderNumber/notifications',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    (req, reply) => controller.getOrderNotifications(req, reply),
  );

  // SSE: real-time order status updates for customers
  app.get<{ Params: { slug: string; orderNumber: string }; Querystring: { phone: string } }>(
    '/s/:slug/orders/:orderNumber/events',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const orderNumber = Number(req.params.orderNumber);
      const { phone } = req.query;

      // Verify the order belongs to this customer (same check as getOrderStatus)
      try {
        await service.getOrderStatus(req.params.slug, orderNumber, phone);
      } catch {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
      }

      const channel = `storefront:${req.params.slug}:${orderNumber}`;

      await reply.hijack();

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      reply.raw.write(':ok\n\n');

      sseManager.addChannelClient(channel, reply);

      const heartbeat = setInterval(() => {
        try {
          reply.raw.write(':ping\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      req.raw.on('close', () => {
        clearInterval(heartbeat);
        sseManager.removeChannelClient(channel, reply);
      });
    },
  );

  // Subscribe to order status changes and broadcast to storefront SSE clients
  const statusEvents = [EventNames.ORDER_STATUS_CHANGED, EventNames.ORDER_CANCELLATION_REQUESTED] as const;
  for (const eventName of statusEvents) {
    getEventBus().subscribe(eventName, async (event) => {
      const { orderId, storeId, toStatus, fromStatus } = event.payload as {
        orderId: number;
        storeId: number;
        toStatus?: number;
        fromStatus?: number;
      };
      if (!storeId || !orderId) return;

      // Skip DB lookups if no storefront SSE clients are listening
      if (!sseManager.hasChannelClientsWithPrefix('storefront:')) return;

      try {
        const order = await OrderCrud.getById(storeId, orderId);
        if (!order) return;

        // Look up the store slug for the channel key
        const pool = getPool();
        const storeResult = await pool.query('SELECT slug FROM stores WHERE id = $1', [storeId]);
        const slug = storeResult.rows[0]?.slug;
        if (!slug) return;

        const channel = `storefront:${slug}:${order.orderNumber}`;
        sseManager.broadcastToChannel(channel, 'order.statusChanged', {
          orderNumber: order.orderNumber,
          status: order.status,
          previousStatus: fromStatus,
        });
      } catch {
        // skip broadcast on error
      }
    });
  }
}
