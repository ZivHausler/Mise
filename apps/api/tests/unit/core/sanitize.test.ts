import { describe, it, expect, vi } from 'vitest';
import { sanitizeMiddleware } from '../../../src/core/middleware/sanitize.js';

function createRequest(body: unknown) {
  return { body } as any;
}

const noop = {} as any;

describe('sanitizeMiddleware', () => {
  it('should strip MongoDB operator keys from flat object', async () => {
    const req = createRequest({ name: 'valid', $gt: 100, $ne: null });
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({ name: 'valid' });
  });

  it('should strip nested MongoDB operators', async () => {
    const req = createRequest({
      user: { name: 'valid', password: { $regex: '.*' } },
    });
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({ user: { name: 'valid', password: {} } });
  });

  it('should strip operators from arrays', async () => {
    const req = createRequest({
      items: [{ name: 'ok' }, { $set: true, value: 1 }],
    });
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({
      items: [{ name: 'ok' }, { value: 1 }],
    });
  });

  it('should preserve null and undefined values', async () => {
    const req = createRequest({ a: null, b: undefined });
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({ a: null, b: undefined });
  });

  it('should preserve primitive values in arrays', async () => {
    const req = createRequest({ tags: ['a', 'b', 'c'] });
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({ tags: ['a', 'b', 'c'] });
  });

  it('should not modify body when no $ keys present', async () => {
    const req = createRequest({ name: 'John', age: 30 });
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({ name: 'John', age: 30 });
  });

  it('should handle empty object', async () => {
    const req = createRequest({});
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({});
  });

  it('should not modify non-object body', async () => {
    const req = createRequest(null);
    await sanitizeMiddleware(req, noop);

    expect(req.body).toBeNull();
  });

  it('should not modify string body', async () => {
    const req = createRequest('raw string');
    await sanitizeMiddleware(req, noop);

    expect(req.body).toBe('raw string');
  });

  it('should strip deeply nested operators', async () => {
    const req = createRequest({
      a: { b: { c: { d: 'ok', $where: 'evil' } } },
    });
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({ a: { b: { c: { d: 'ok' } } } });
  });

  it('should strip multiple different $ operators', async () => {
    const req = createRequest({
      $gt: 1,
      $lt: 10,
      $ne: null,
      $regex: '.*',
      $where: 'this',
      $set: { x: 1 },
      valid: 'keep',
    });
    await sanitizeMiddleware(req, noop);

    expect(req.body).toEqual({ valid: 'keep' });
  });
});
