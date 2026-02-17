import type { FastifyInstance } from 'fastify';
import { authMiddleware, requireStoreMiddleware } from '../../core/middleware/auth.js';

import { UnitsService } from './units/units.service.js';
import { UnitsController } from './units/units.controller.js';

import { GroupsService } from './groups/groups.service.js';
import { GroupsController } from './groups/groups.controller.js';

import { ProfileService } from './profile/profile.service.js';
import { ProfileController } from './profile/profile.controller.js';

import { NotificationsService } from './notifications/notifications.service.js';
import { NotificationsController } from './notifications/notifications.controller.js';

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

  // Groups
  const groupsService = new GroupsService();
  const groupsController = new GroupsController(groupsService);

  app.get('/groups', (req, reply) => groupsController.list(req, reply));
  app.post('/groups', (req, reply) => groupsController.create(req, reply));
  app.put('/groups/:id', (req, reply) => groupsController.update(req, reply));
  app.delete('/groups/:id', (req, reply) => groupsController.delete(req, reply));

  // Profile
  const profileService = new ProfileService();
  const profileController = new ProfileController(profileService);

  app.get('/profile', (req, reply) => profileController.get(req, reply));
  app.patch('/profile', (req, reply) => profileController.update(req, reply));

  // Notifications
  const notificationsService = new NotificationsService();
  const notificationsController = new NotificationsController(notificationsService);

  app.get('/notifications', (req, reply) => notificationsController.get(req, reply));
  app.put('/notifications', (req, reply) => notificationsController.update(req, reply));
}
