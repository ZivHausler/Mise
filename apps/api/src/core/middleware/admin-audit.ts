import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { getPool } from '../database/postgres.js';
import { appLogger } from '../logger/logger.js';

const MAX_BODY_SIZE = 10 * 1024; // 10KB cap

function truncateBody(body: unknown): unknown {
  if (body === undefined || body === null) return null;
  try {
    const json = typeof body === 'string' ? body : JSON.stringify(body);
    if (json.length > MAX_BODY_SIZE) {
      return { _truncated: true, _size: json.length };
    }
    return typeof body === 'string' ? JSON.parse(json) : body;
  } catch {
    return null;
  }
}

export const adminAuditPlugin = fp(async function adminAuditPlugin(app: FastifyInstance) {
  // Use onSend to capture response payload before it's sent
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    if (!request.currentUser?.userId) return payload;

    // Skip admin GET requests to avoid feedback loops from polling/browsing
    const path = request.url.split('?')[0];
    if (request.method === 'GET' && path?.startsWith('/api/admin/')) return payload;

    const requestBody = truncateBody(request.body);

    let responseBody: unknown = null;
    try {
      if (typeof payload === 'string') {
        responseBody = truncateBody(JSON.parse(payload));
      }
    } catch {
      // Not JSON, skip
    }

    // Fire-and-forget: don't await, swallow errors so logging never breaks requests
    const pool = getPool();
    pool.query(
      `INSERT INTO admin_audit_log (user_id, store_id, method, path, status_code, ip)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        request.currentUser.userId,
        request.currentUser.storeId || null,
        request.method,
        request.url,
        reply.statusCode,
        request.ip,
      ],
    ).then((result: { rows: Record<string, unknown>[] }) => {
      const auditLogId = result.rows[0]!['id'] as string;
      const promises: Promise<unknown>[] = [];

      if (requestBody) {
        promises.push(
          pool.query(
            `INSERT INTO admin_audit_log_request_body (audit_log_id, body) VALUES ($1, $2)`,
            [auditLogId, JSON.stringify(requestBody)],
          ),
        );
      }

      if (responseBody) {
        promises.push(
          pool.query(
            `INSERT INTO admin_audit_log_response_body (audit_log_id, body) VALUES ($1, $2)`,
            [auditLogId, JSON.stringify(responseBody)],
          ),
        );
      }

      return Promise.all(promises);
    }).catch((err: unknown) => {
      appLogger.error({ err, method: request.method, url: request.url }, 'Audit log insert failed');
    });

    return payload;
  });
});
