import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPool } from '../database/postgres.js';

export async function adminAuditPlugin(app: FastifyInstance) {
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.currentUser?.isAdmin) return;

    // Fire-and-forget: don't await, swallow errors so logging never breaks requests
    const pool = getPool();
    pool.query(
      `INSERT INTO admin_audit_log (user_id, store_id, method, path, status_code, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        request.currentUser.userId,
        request.currentUser.storeId || null,
        request.method,
        request.url,
        reply.statusCode,
        request.ip,
      ],
    ).catch(() => {
      // Swallow errors — audit logging must never break requests
    });
  });
}
