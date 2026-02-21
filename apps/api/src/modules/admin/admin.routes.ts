import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { authMiddleware, requireAdminMiddleware } from '../../core/middleware/auth.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import { env } from '../../config/env.js';

async function adminSecretMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== env.ADMIN_SECRET) {
    throw new UnauthorizedError('Invalid admin credentials');
  }
}

export default async function adminRoutes(app: FastifyInstance) {
  const service = new AdminService(app);
  const controller = new AdminController(service);

  const adminPreHandler = { preHandler: [authMiddleware, requireAdminMiddleware] };

  // Users
  app.get('/users', adminPreHandler, (req, reply) => controller.getUsers(req, reply));
  app.patch('/users/:id/admin', adminPreHandler, (req, reply) => controller.toggleAdmin(req, reply));
  app.patch('/users/:id/disabled', adminPreHandler, (req, reply) => controller.toggleDisabled(req, reply));
  app.delete('/users/:id', adminPreHandler, (req, reply) => controller.deleteUser(req, reply));

  // Stores
  app.get('/stores', adminPreHandler, (req, reply) => controller.getStores(req, reply));
  app.get('/stores/:id/members', adminPreHandler, (req, reply) => controller.getStoreMembers(req, reply));
  app.patch('/stores/:id', adminPreHandler, (req, reply) => controller.updateStore(req, reply));
  app.delete('/stores/:id', adminPreHandler, (req, reply) => controller.deleteStore(req, reply));

  // Invitations
  app.get('/invitations', adminPreHandler, (req, reply) => controller.getInvitations(req, reply));
  app.get('/invitations/emails', adminPreHandler, (req, reply) => controller.getDistinctInvitationEmails(req, reply));
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

  // Test cleanup - secured by admin secret (used by E2E teardown)
  app.post('/cleanup-test-users', { preHandler: [adminSecretMiddleware] }, (req, reply) => controller.cleanupTestUsers(req, reply));
}
