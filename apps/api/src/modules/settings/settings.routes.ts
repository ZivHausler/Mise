import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../core/middleware/auth.js';

import { PgUnitsRepository } from './units/units.repository.js';
import { UnitsService } from './units/units.service.js';
import { UnitsController } from './units/units.controller.js';

import { PgGroupsRepository } from './groups/groups.repository.js';
import { GroupsService } from './groups/groups.service.js';
import { GroupsController } from './groups/groups.controller.js';

import { PgAuthRepository } from '../auth/auth.repository.js';
import { ProfileService } from './profile/profile.service.js';
import { ProfileController } from './profile/profile.controller.js';

import { PgNotifPrefsRepository } from './notifications/notifications.repository.js';
import { NotificationsService } from './notifications/notifications.service.js';
import { NotificationsController } from './notifications/notifications.controller.js';

export default async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Shared repositories
  const authRepository = new PgAuthRepository();

  // Units
  const unitsRepository = new PgUnitsRepository();
  const unitsService = new UnitsService(unitsRepository);
  const unitsController = new UnitsController(unitsService);

  app.get('/units', (req, reply) => unitsController.list(req, reply));
  app.get('/units/categories', (req, reply) => unitsController.listCategories(req, reply));
  app.post('/units', (req, reply) => unitsController.create(req, reply));
  app.put('/units/:id', (req, reply) => unitsController.update(req, reply));
  app.delete('/units/:id', (req, reply) => unitsController.delete(req, reply));

  // Groups
  const groupsRepository = new PgGroupsRepository();
  const groupsService = new GroupsService(groupsRepository);
  const groupsController = new GroupsController(groupsService);

  app.get('/groups', (req, reply) => groupsController.list(req, reply));
  app.post('/groups', (req, reply) => groupsController.create(req, reply));
  app.put('/groups/:id', (req, reply) => groupsController.update(req, reply));
  app.delete('/groups/:id', (req, reply) => groupsController.delete(req, reply));

  // Profile
  const profileService = new ProfileService(authRepository);
  const profileController = new ProfileController(profileService);

  app.get('/profile', (req, reply) => profileController.get(req, reply));
  app.patch('/profile', (req, reply) => profileController.update(req, reply));

  // Notifications
  const notifPrefsRepository = new PgNotifPrefsRepository();
  const notificationsService = new NotificationsService(notifPrefsRepository, authRepository);
  const notificationsController = new NotificationsController(notificationsService);

  app.get('/notifications', (req, reply) => notificationsController.get(req, reply));
  app.put('/notifications', (req, reply) => notificationsController.update(req, reply));
}
