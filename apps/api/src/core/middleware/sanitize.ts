import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Recursively strips MongoDB operator keys ($gt, $ne, $regex, etc.)
 * from request body objects to prevent NoSQL injection attacks.
 */
function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object' && value !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Strip keys starting with $ (MongoDB operators)
      if (key.startsWith('$')) continue;
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Fastify preHandler hook that sanitizes request body
 * to prevent NoSQL injection via MongoDB operator injection.
 */
export async function sanitizeMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  if (request.body && typeof request.body === 'object') {
    request.body = sanitizeValue(request.body);
  }
}
