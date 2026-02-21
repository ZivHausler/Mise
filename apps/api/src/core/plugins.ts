import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';

import { env } from '../config/env.js';
import { requestContextPlugin } from './middleware/request-context.js';
import { adminAuditPlugin } from './middleware/admin-audit.js';
import { appLogger } from './logger/logger.js';

export async function registerCorePlugins(app: FastifyInstance) {
  // CORS — restrict to configured origins, never wildcard in production
  const origins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean).filter((origin) => {
    try {
      new URL(origin);
      return true;
    } catch {
      appLogger.warn({ origin }, 'Invalid CORS origin URL, skipping');
      return false;
    }
  });
  await app.register(cors, {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  // Helmet — always enable security headers including CSP
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://storage.googleapis.com', 'https://images.unsplash.com'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  });

  // Global rate limiting
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });

  // JWT
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(requestContextPlugin);
  await app.register(adminAuditPlugin);
}

/**
 * Stricter rate limit for auth endpoints (login/register) to prevent brute force.
 * Apply via: app.register(authRateLimitPlugin)
 */
export async function authRateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: env.AUTH_RATE_LIMIT_MAX,
    timeWindow: env.AUTH_RATE_LIMIT_WINDOW,
    keyGenerator: (request) => {
      return request.ip;
    },
  });
}
