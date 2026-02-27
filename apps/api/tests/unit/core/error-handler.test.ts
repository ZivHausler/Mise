import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError, ValidationError, NotFoundError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/config/env.js', () => ({
  env: { NODE_ENV: 'development' },
}));

import { globalErrorHandler } from '../../../src/core/errors/error-handler.js';

function createMockRequest(id = 'req-1') {
  return {
    id,
    log: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as any;
}

function createMockReply() {
  const reply: any = {
    status: vi.fn(),
    send: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  return reply;
}

describe('globalErrorHandler', () => {
  let req: any;
  let reply: any;

  beforeEach(() => {
    req = createMockRequest();
    reply = createMockReply();
  });

  it('should handle AppError with correct status and error code', () => {
    const error = new ValidationError('Invalid input');

    globalErrorHandler(error, req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      }),
    }));
  });

  it('should handle NotFoundError with 404', () => {
    const error = new NotFoundError('Order not found');

    globalErrorHandler(error, req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it('should handle Fastify validation errors', () => {
    const error = { validation: [{ message: 'bad' }], message: 'Validation failed' } as any;

    globalErrorHandler(error, req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        message: 'Validation failed',
      }),
    }));
  });

  it('should handle rate limit errors with 429', () => {
    const error = { statusCode: 429, message: 'Rate limited' } as any;

    globalErrorHandler(error, req, reply);

    expect(reply.status).toHaveBeenCalledWith(429);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: 'Too many requests. Please try again later.',
      }),
    }));
  });

  it('should handle unknown errors with 500', () => {
    const error = new Error('Something broke');

    globalErrorHandler(error, req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        message: 'An unexpected error occurred',
      }),
    }));
  });

  it('should include detail in development mode', () => {
    const error = new Error('DB connection failed');

    globalErrorHandler(error, req, reply);

    const sentPayload = reply.send.mock.calls[0][0];
    expect(sentPayload.error.detail).toBe('DB connection failed');
  });

  it('should include requestId in response', () => {
    const error = new ValidationError('bad');

    globalErrorHandler(error, req, reply);

    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'req-1',
    }));
  });

  it('should include data field when AppError has data', () => {
    const error = new AppError('bad', 400, 'CUSTOM');
    (error as any).data = { field: 'email' };

    globalErrorHandler(error, req, reply);

    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        data: { field: 'email' },
      }),
    }));
  });
});
