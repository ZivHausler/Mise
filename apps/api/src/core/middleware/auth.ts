import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';
import type { AuthTokenPayload } from '../../modules/auth/auth.types.js';
import { getPool } from '../database/postgres.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthTokenPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  try {
    const payload = await request.jwtVerify<AuthTokenPayload>();
    request.currentUser = payload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function requireStoreMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.currentUser?.storeId) {
    throw new ForbiddenError('No store selected. Please create or join a store first.');
  }

  const { userId, storeId } = request.currentUser;
  const pool = getPool();
  const result = await pool.query(
    `SELECT role FROM users_stores WHERE user_id = $1 AND store_id = $2`,
    [userId, storeId],
  );

  if (!result.rows[0]) {
    throw new ForbiddenError('Store not found or you no longer have access to it.');
  }
}
