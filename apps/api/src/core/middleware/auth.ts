import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';
import type { AuthTokenPayload } from '../../modules/auth/auth.types.js';
import { StoreRole } from '../../modules/stores/store.types.js';
import { getPool } from '../database/postgres.js';
import { isTokenBlacklisted } from '../auth/token-blacklist.js';
import { ErrorCode } from '@mise/shared';

// In-memory cache for user status lookups (30s TTL)
const USER_STATUS_TTL_MS = 30_000;

interface CachedUserStatus {
  exists: boolean;
  disabled: boolean;
  cachedAt: number;
}

const userStatusCache = new Map<number, CachedUserStatus>();

export function clearUserStatusCache(): void {
  userStatusCache.clear();
}

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
    throw new UnauthorizedError('Missing or invalid authorization header', ErrorCode.AUTH_MISSING_TOKEN);
  }

  try {
    const payload = await request.jwtVerify<AuthTokenPayload>();

    if (payload.jti && await isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedError('Token has been revoked', ErrorCode.AUTH_TOKEN_REVOKED);
    }

    const now = Date.now();
    let cached = userStatusCache.get(payload.userId);

    if (!cached || (now - cached.cachedAt) > USER_STATUS_TTL_MS) {
      const pool = getPool();
      const result = await pool.query('SELECT id, disabled_at FROM users WHERE id = $1', [payload.userId]);
      cached = {
        exists: !!result.rows[0],
        disabled: !!result.rows[0]?.disabled_at,
        cachedAt: now,
      };
      userStatusCache.set(payload.userId, cached);
    }

    if (!cached.exists) {
      throw new UnauthorizedError('User no longer exists', ErrorCode.AUTH_USER_NOT_FOUND);
    }
    if (cached.disabled) {
      throw new UnauthorizedError('Account has been disabled', ErrorCode.AUTH_ACCOUNT_DISABLED);
    }

    request.currentUser = payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired token', ErrorCode.AUTH_TOKEN_EXPIRED);
  }
}

export async function requireStoreMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const pool = getPool();

  // Admin bypass: admins can proceed even without a store selected
  if (request.currentUser?.isAdmin) {
    const adminResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [request.currentUser.userId],
    );
    if (adminResult.rows[0]?.['is_admin'] === true) {
      // If admin has a storeId, verify it exists
      if (request.currentUser.storeId) {
        const storeResult = await pool.query('SELECT id FROM stores WHERE id = $1', [request.currentUser.storeId]);
        if (!storeResult.rows[0]) {
          throw new ForbiddenError('Store not found', ErrorCode.STORE_NOT_FOUND);
        }
      }
      return;
    }
  }

  if (!request.currentUser?.storeId) {
    throw new ForbiddenError('No store selected', ErrorCode.STORE_NO_STORE_SELECTED);
  }

  const { userId, storeId, storeRole } = request.currentUser;

  // Admin bypass via storeRole (legacy tokens)
  if (storeRole === StoreRole.ADMIN) {
    const adminResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId],
    );
    if (!adminResult.rows[0] || adminResult.rows[0]['is_admin'] !== true) {
      throw new ForbiddenError('Admin privileges revoked', ErrorCode.STORE_ADMIN_PRIVILEGES_REVOKED);
    }
    const storeResult = await pool.query('SELECT id FROM stores WHERE id = $1', [storeId]);
    if (!storeResult.rows[0]) {
      throw new ForbiddenError('Store not found', ErrorCode.STORE_NOT_FOUND);
    }
    return;
  }

  const result = await pool.query(
    `SELECT role FROM users_stores WHERE user_id = $1 AND store_id = $2`,
    [userId, storeId],
  );

  if (!result.rows[0]) {
    throw new ForbiddenError('Store not found or no access', ErrorCode.STORE_NO_ACCESS);
  }
}

export async function requireAdminMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.currentUser) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }

  const pool = getPool();
  const result = await pool.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [request.currentUser.userId],
  );

  if (!result.rows[0] || result.rows[0]['is_admin'] !== true) {
    throw new ForbiddenError('Admin access required', ErrorCode.STORE_ADMIN_REQUIRED);
  }
}
