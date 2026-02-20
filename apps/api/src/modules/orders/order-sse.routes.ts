import type { FastifyInstance } from 'fastify';
import { sseManager } from '../../core/sse/sse-manager.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { OrderService } from './order.service.js';
import { RecipeService } from '../recipes/recipe.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import type { AuthTokenPayload } from '../auth/auth.types.js';
import { isTokenBlacklisted } from '../../core/auth/token-blacklist.js';

export default async function orderSSERoutes(app: FastifyInstance) {
  const inventoryService = new InventoryService();
  const recipeService = new RecipeService(inventoryService);
  const orderService = new OrderService(recipeService, inventoryService);

  // Subscribe to order.created events and broadcast via SSE
  getEventBus().subscribe(EventNames.ORDER_CREATED, async (event) => {
    const { orderId, storeId } = event.payload as { orderId: string; storeId: string };
    if (!storeId) return;

    try {
      const order = await orderService.getById(storeId, orderId);
      sseManager.broadcast(storeId, 'order.created', order);
    } catch {
      // order not found or other error — skip broadcast
    }
  });

  app.get<{ Querystring: { token?: string } }>('/events', async (request, reply) => {
    // Authenticate via query param token (EventSource can't set headers)
    const token = request.query.token;
    if (!token) {
      throw new UnauthorizedError('Missing token');
    }

    let payload: AuthTokenPayload;
    try {
      payload = app.jwt.verify<AuthTokenPayload>(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    if (payload.jti && await isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    const storeId = payload.storeId;
    if (!storeId) {
      throw new UnauthorizedError('No store selected');
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial comment to establish connection
    reply.raw.write(':ok\n\n');

    sseManager.addClient(storeId, reply);

    // Clean up on disconnect
    request.raw.on('close', () => {
      sseManager.removeClient(storeId, reply);
    });

    // Keep the connection open — don't call reply.send()
    // Fastify will handle the raw response we've already started
  });
}
