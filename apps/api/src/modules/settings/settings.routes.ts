import type { FastifyInstance } from 'fastify';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

import { UnitsService } from './units/units.service.js';
import { UnitsController } from './units/units.controller.js';

import { AllergensService } from './allergens/allergens.service.js';
import { AllergensController } from './allergens/allergens.controller.js';

import { ProfileService } from './profile/profile.service.js';
import { ProfileController } from './profile/profile.controller.js';

import { NotificationsService } from './notifications/notifications.service.js';
import { NotificationsController } from './notifications/notifications.controller.js';

import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { LoyaltyController } from '../loyalty/loyalty.controller.js';

export default async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireStoreMiddleware);

  // Units
  const unitsService = new UnitsService();
  const unitsController = new UnitsController(unitsService);

  app.get('/units', (req, reply) => unitsController.list(req, reply));
  app.get('/units/categories', (req, reply) => unitsController.listCategories(req, reply));
  app.post('/units', (req, reply) => unitsController.create(req, reply));
  app.put('/units/:id', (req, reply) => unitsController.update(req, reply));
  app.delete('/units/:id', (req, reply) => unitsController.delete(req, reply));

  // Allergens
  const allergensService = new AllergensService();
  const allergensController = new AllergensController(allergensService);

  app.get('/allergens', (req, reply) => allergensController.list(req, reply));
  app.post('/allergens', (req, reply) => allergensController.create(req, reply));
  app.put('/allergens/:id', (req, reply) => allergensController.update(req, reply));
  app.delete('/allergens/:id', (req, reply) => allergensController.delete(req, reply));

  // Profile
  const profileService = new ProfileService();
  const profileController = new ProfileController(profileService);

  app.get('/profile', (req, reply) => profileController.get(req, reply));
  app.patch('/profile', (req, reply) => profileController.update(req, reply));

  // Onboarding
  app.get('/onboarding', (req, reply) => profileController.getOnboarding(req, reply));
  app.patch('/onboarding/complete', (req, reply) => profileController.completeOnboarding(req, reply));
  app.patch('/onboarding/reset', (req, reply) => profileController.resetOnboarding(req, reply));

  // Notifications
  const notificationsService = new NotificationsService();
  const notificationsController = new NotificationsController(notificationsService);

  app.get('/notifications', (req, reply) => notificationsController.get(req, reply));
  app.put('/notifications', (req, reply) => notificationsController.update(req, reply));

  // Loyalty
  const loyaltyService = new LoyaltyService();
  const loyaltyController = new LoyaltyController(loyaltyService);

  app.get('/loyalty', (req, reply) => loyaltyController.getConfig(req, reply));
  app.patch('/loyalty', (req, reply) => loyaltyController.updateConfig(req, reply));
}
