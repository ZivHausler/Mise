import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';
import type { AuthTokenPayload } from '../../modules/auth/auth.types.js';
import { StoreRole } from '../../modules/stores/store.types.js';
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

    const pool = getPool();
    const result = await pool.query('SELECT id, disabled_at FROM users WHERE id = $1', [payload.userId]);
    if (!result.rows[0]) {
      throw new UnauthorizedError('User no longer exists');
    }
    if (result.rows[0].disabled_at) {
      throw new UnauthorizedError('Account has been disabled');
    }

    request.currentUser = payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function requireStoreMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.currentUser?.storeId) {
    throw new ForbiddenError('No store selected. Please create or join a store first.');
  }

  const { userId, storeId, storeRole } = request.currentUser;
  const pool = getPool();

  // Admin bypass: verify is_admin in DB (not just JWT claim)
  if (storeRole === StoreRole.ADMIN) {
    const adminResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId],
    );
    if (!adminResult.rows[0] || adminResult.rows[0]['is_admin'] !== true) {
      throw new ForbiddenError('Admin privileges revoked.');
    }
    // Verify the store exists
    const storeResult = await pool.query('SELECT id FROM stores WHERE id = $1', [storeId]);
    if (!storeResult.rows[0]) {
      throw new ForbiddenError('Store not found.');
    }
    return;
  }

  const result = await pool.query(
    `SELECT role FROM users_stores WHERE user_id = $1 AND store_id = $2`,
    [userId, storeId],
  );

  if (!result.rows[0]) {
    throw new ForbiddenError('Store not found or you no longer have access to it.');
  }
}

export async function requireAdminMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.currentUser) {
    throw new UnauthorizedError('Authentication required');
  }

  const pool = getPool();
  const result = await pool.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [request.currentUser.userId],
  );

  if (!result.rows[0] || result.rows[0]['is_admin'] !== true) {
    throw new ForbiddenError('Admin access required');
  }
}
