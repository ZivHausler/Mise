import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PayPalOrdersService } from '../../../src/modules/storefront/paypal-orders.service.js';
import { ValidationError, InternalError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/config/env.js', () => ({
  env: {
    PAYPAL_CLIENT_ID: 'test-client-id',
    PAYPAL_CLIENT_SECRET: 'test-client-secret',
    PAYPAL_API_URL: 'https://api-m.sandbox.paypal.com',
  },
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('PayPalOrdersService', () => {
  let service: PayPalOrdersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PayPalOrdersService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockAuthSuccess() {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'test-token-123', expires_in: 3600 }),
    });
  }

  // ── createOrder ──

  describe('createOrder', () => {
    it('should create a PayPal order and return order ID + approval URL', async () => {
      mockAuthSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'PP-ORDER-001',
          links: [
            { href: 'https://api.paypal.com/v2/checkout/orders/PP-ORDER-001', rel: 'self' },
            { href: 'https://www.paypal.com/checkoutnow?token=PP-ORDER-001', rel: 'payer-action' },
          ],
        }),
      });

      const result = await service.createOrder(120, 'ILS', 'Test order', 'my-store');

      expect(result.paypalOrderId).toBe('PP-ORDER-001');
      expect(result.approvalUrl).toBe('https://www.paypal.com/checkoutnow?token=PP-ORDER-001');

      // Verify the create order request body
      const createCall = mockFetch.mock.calls[1]!;
      expect(createCall[0]).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders');
      const body = JSON.parse(createCall[1].body);
      expect(body.intent).toBe('CAPTURE');
      expect(body.purchase_units[0].amount.value).toBe('120.00');
      expect(body.purchase_units[0].amount.currency_code).toBe('ILS');
    });

    it('should cache auth token for subsequent calls', async () => {
      // First call: auth + create
      mockAuthSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'PP-ORDER-001',
          links: [{ href: 'https://paypal.com/approve', rel: 'payer-action' }],
        }),
      });

      await service.createOrder(50, 'ILS', 'Order 1', 'store-1');
      expect(mockFetch).toHaveBeenCalledTimes(2); // auth + create

      // Second call: should reuse token, only create
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'PP-ORDER-002',
          links: [{ href: 'https://paypal.com/approve', rel: 'payer-action' }],
        }),
      });

      await service.createOrder(75, 'ILS', 'Order 2', 'store-1');
      expect(mockFetch).toHaveBeenCalledTimes(3); // no new auth call
    });

    it('should throw InternalError when auth fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(service.createOrder(50, 'ILS', 'Test', 'store-1')).rejects.toThrow(InternalError);
    });

    it('should throw InternalError when create order API fails', async () => {
      mockAuthSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(service.createOrder(50, 'ILS', 'Test', 'store-1')).rejects.toThrow(InternalError);
    });

    it('should throw InternalError when no approval link in response', async () => {
      mockAuthSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'PP-ORDER-003',
          links: [{ href: 'https://api.paypal.com/self', rel: 'self' }],
        }),
      });

      await expect(service.createOrder(50, 'ILS', 'Test', 'store-1')).rejects.toThrow(InternalError);
    });
  });

  // ── captureOrder ──

  describe('captureOrder', () => {
    it('should capture a PayPal order and return transaction details', async () => {
      mockAuthSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          purchase_units: [{
            payments: {
              captures: [{
                id: 'CAPTURE-001',
                amount: { currency_code: 'ILS', value: '120.00' },
              }],
            },
          }],
        }),
      });

      const result = await service.captureOrder('PPORDER001');

      expect(result.status).toBe('COMPLETED');
      expect(result.transactionId).toBe('CAPTURE-001');
      expect(result.amount).toEqual({ currency: 'ILS', value: '120.00' });
    });

    it('should throw ValidationError for invalid order ID format', async () => {
      await expect(service.captureOrder('invalid-order-id!')).rejects.toThrow(ValidationError);
      await expect(service.captureOrder('has spaces')).rejects.toThrow(ValidationError);
      await expect(service.captureOrder('special@chars')).rejects.toThrow(ValidationError);
    });

    it('should throw InternalError when capture API fails', async () => {
      mockAuthSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable Entity',
      });

      await expect(service.captureOrder('PPORDER001')).rejects.toThrow(InternalError);
    });

    it('should refresh token when expired', async () => {
      // First call to prime expired token
      mockAuthSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'PP-ORDER-001',
          links: [{ href: 'https://paypal.com/approve', rel: 'payer-action' }],
        }),
      });

      await service.createOrder(50, 'ILS', 'Test', 'store-1');

      // Manually expire the token by accessing private field
      (service as any).tokenExpiresAt = 0;

      // Next call should require new auth
      mockAuthSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          purchase_units: [{ payments: { captures: [{ id: 'C-001', amount: { currency_code: 'ILS', value: '50.00' } }] } }],
        }),
      });

      const result = await service.captureOrder('PPORDER002');

      expect(result.status).toBe('COMPLETED');
      // auth was called twice total (initial + refresh)
      const authCalls = mockFetch.mock.calls.filter(
        (call) => (call[0] as string).includes('/v1/oauth2/token'),
      );
      expect(authCalls).toHaveLength(2);
    });
  });
});
