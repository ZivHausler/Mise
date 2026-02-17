import type { FastifyInstance } from 'fastify';

export async function registerModules(app: FastifyInstance) {
  await app.register(import('./auth/auth.routes.js'), { prefix: '/api/auth' });
  await app.register(import('./stores/store.routes.js'), { prefix: '/api/stores' });
  await app.register(import('./customers/customer.routes.js'), { prefix: '/api/customers' });
  await app.register(import('./inventory/inventory.routes.js'), { prefix: '/api/inventory' });
  await app.register(import('./recipes/recipe.routes.js'), { prefix: '/api/recipes' });
  await app.register(import('./orders/order.routes.js'), { prefix: '/api/orders' });
  await app.register(import('./payments/payment.routes.js'), { prefix: '/api/payments' });
  await app.register(import('./notifications/notification.routes.js'), { prefix: '/api/notifications' });
  await app.register(import('./analytics/analytics.routes.js'), { prefix: '/api/analytics' });
  await app.register(import('./settings/settings.routes.js'), { prefix: '/api/settings' });

  app.log.info('All modules registered');
}
