import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../errors/app-error.js';
import type { AuthTokenPayload } from '../../modules/auth/auth.types.js';

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
