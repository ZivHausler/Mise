import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { AppError } from './app-error.js';
import { env } from '../../config/env.js';

export function globalErrorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = request.id;
  const isProduction = env.NODE_ENV === 'production';

  if (error instanceof AppError) {
    request.log.warn(
      { err: error, requestId, errorCode: error.errorCode },
      error.message,
    );
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        ...('data' in error && error.data ? { data: error.data } : {}),
      },
      requestId,
    });
  }

  // Fastify validation errors
  if ('validation' in error && error.validation) {
    request.log.warn({ err: error, requestId }, 'Validation error');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
      },
      requestId,
    });
  }

  // Rate limit errors
  if ('statusCode' in error && error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
      requestId,
    });
  }

  // Unknown errors — never leak internals in production
  request.log.error({ err: error, requestId }, 'Unhandled error');
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      // Only include stack trace in development for debugging
      ...(isProduction ? {} : { detail: error.message }),
    },
    requestId,
  });
}
