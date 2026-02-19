import type { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { authMiddleware, requireAdminMiddleware } from '../../core/middleware/auth.js';

export default async function adminRoutes(app: FastifyInstance) {
  const service = new AdminService(app);
  const controller = new AdminController(service);

  const adminPreHandler = { preHandler: [authMiddleware, requireAdminMiddleware] };

  // Users
  app.get('/users', adminPreHandler, (req, reply) => controller.getUsers(req, reply));
  app.patch('/users/:id/admin', adminPreHandler, (req, reply) => controller.toggleAdmin(req, reply));
  app.patch('/users/:id/disabled', adminPreHandler, (req, reply) => controller.toggleDisabled(req, reply));

  // Stores
  app.get('/stores', adminPreHandler, (req, reply) => controller.getStores(req, reply));
  app.get('/stores/:id/members', adminPreHandler, (req, reply) => controller.getStoreMembers(req, reply));
  app.patch('/stores/:id', adminPreHandler, (req, reply) => controller.updateStore(req, reply));

  // Invitations
  app.get('/invitations', adminPreHandler, (req, reply) => controller.getInvitations(req, reply));
  app.post('/invitations/create-store', adminPreHandler, (req, reply) => controller.createStoreInvitation(req, reply));
  app.patch('/invitations/:id/revoke', adminPreHandler, (req, reply) => controller.revokeInvitation(req, reply));

  // Audit log
  app.get('/audit-log', adminPreHandler, (req, reply) => controller.getAuditLog(req, reply));
  app.get('/audit-log/:id/request-body', adminPreHandler, (req, reply) => controller.getAuditLogRequestBody(req, reply));
  app.get('/audit-log/:id/response-body', adminPreHandler, (req, reply) => controller.getAuditLogResponseBody(req, reply));

  // Analytics
  app.get('/analytics', adminPreHandler, (req, reply) => controller.getAnalytics(req, reply));

  // Lightweight gate check used by frontend on admin panel entry
  app.get('/access', adminPreHandler, (_req, reply) => reply.send({ success: true }));
}
