import type { FastifyInstance } from 'fastify';
import { RecipeController } from './recipe.controller.js';
import { RecipeService } from './recipe.service.js';
import { MongoRecipeRepository } from './recipe.repository.js';
import { InMemoryEventBus } from '../../core/events/event-bus.js';
import { authMiddleware } from '../../core/middleware/auth.js';

export default async function recipeRoutes(app: FastifyInstance) {
  const repository = new MongoRecipeRepository();
  const eventBus = (app as any).container?.resolve?.('eventBus') ?? new InMemoryEventBus();
  const service = new RecipeService(repository, eventBus);
  const controller = new RecipeController(service);

  app.addHook('preHandler', authMiddleware);

  app.get('/', (req, reply) => controller.getAll(req as any, reply));
  app.get('/:id', (req, reply) => controller.getById(req as any, reply));
  app.get('/:id/cost', (req, reply) => controller.calculateCost(req as any, reply));
  app.post('/', (req, reply) => controller.create(req, reply));
  app.put('/:id', (req, reply) => controller.update(req as any, reply));
  app.delete('/:id', (req, reply) => controller.delete(req as any, reply));
}
