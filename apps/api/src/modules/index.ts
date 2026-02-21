import type { FastifyInstance } from 'fastify';
import localUploadRoutes from '../core/storage/local-upload.routes.js';

export async function registerModules(app: FastifyInstance) {
  // Local file upload/serving routes (dev only, no-op when GCS is configured)
  await app.register(localUploadRoutes);
  await app.register(import('./auth/auth.routes.js'), { prefix: '/api/auth' });
  await app.register(import('./stores/store.routes.js'), { prefix: '/api/stores' });
  await app.register(import('./customers/customer.routes.js'), { prefix: '/api/customers' });
  await app.register(import('./inventory/inventory.routes.js'), { prefix: '/api/inventory' });
  await app.register(import('./recipes/recipe.routes.js'), { prefix: '/api/recipes' });
  await app.register(import('./orders/order.routes.js'), { prefix: '/api/orders' });
  await app.register(import('./orders/order-sse.routes.js'), { prefix: '/api/orders' });
  await app.register(import('./production/production.routes.js'), { prefix: '/api/production' });
  await app.register(import('./payments/payment.routes.js'), { prefix: '/api/payments' });
  await app.register(import('./notifications/notification.routes.js'), { prefix: '/api/notifications' });
  await app.register(import('./analytics/analytics.routes.js'), { prefix: '/api/analytics' });
  await app.register(import('./loyalty/loyalty.routes.js'), { prefix: '/api/loyalty' });
  await app.register(import('./settings/settings.routes.js'), { prefix: '/api/settings' });
  await app.register(import('./admin/admin.routes.js'), { prefix: '/api/admin' });
  await app.register(import('./features/features.routes.js'), { prefix: '/api/features' });

  app.log.info('All modules registered');
}
