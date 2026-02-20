import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoyaltyController } from '../../../src/modules/loyalty/loyalty.controller.js';
import { LoyaltyService } from '../../../src/modules/loyalty/loyalty.service.js';
import { ZodError } from 'zod';

function createMockRequest(overrides: Record<string, unknown> = {}): any {
  return {
    currentUser: { id: 'user-1', storeId: 'store-1' },
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

function createMockReply(): any {
  const reply: any = {};
  reply.send = vi.fn().mockReturnValue(reply);
  reply.status = vi.fn().mockReturnValue(reply);
  return reply;
}

describe('LoyaltyController', () => {
  let controller: LoyaltyController;
  let service: LoyaltyService;
  let reply: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = {
      getCustomerBalance: vi.fn(),
      getCustomerTransactions: vi.fn(),
      adjustPoints: vi.fn(),
      redeemPoints: vi.fn(),
      getConfig: vi.fn(),
      upsertConfig: vi.fn(),
    } as unknown as LoyaltyService;
    controller = new LoyaltyController(service);
    reply = createMockReply();
  });

  describe('getCustomerBalance', () => {
    it('should return customer loyalty summary', async () => {
      const summary = { balance: 100, lifetimeEarned: 200, lifetimeRedeemed: 100 };
      vi.mocked(service.getCustomerBalance).mockResolvedValue(summary);

      const req = createMockRequest({ params: { customerId: 'cust-1' } });
      await controller.getCustomerBalance(req, reply);

      expect(service.getCustomerBalance).toHaveBeenCalledWith('store-1', 'cust-1');
      expect(reply.send).toHaveBeenCalledWith({ success: true, data: summary });
    });
  });

  describe('getCustomerTransactions', () => {
    it('should return paginated transactions with defaults', async () => {
      const txResult = {
        items: [{ id: 'tx-1', type: 'earned', points: 50, balanceAfter: 50 }],
        total: 1,
      };
      vi.mocked(service.getCustomerTransactions).mockResolvedValue(txResult);

      const req = createMockRequest({
        params: { customerId: 'cust-1' },
        query: {},
      });
      await controller.getCustomerTransactions(req, reply);

      expect(service.getCustomerTransactions).toHaveBeenCalledWith(
        'store-1',
        'cust-1',
        { limit: 10, offset: 0 },
      );
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: txResult.items,
          pagination: expect.objectContaining({ page: 1, limit: 10, total: 1, totalPages: 1 }),
        }),
      );
    });

    it('should respect page and limit query params', async () => {
      vi.mocked(service.getCustomerTransactions).mockResolvedValue({ items: [], total: 25 });

      const req = createMockRequest({
        params: { customerId: 'cust-1' },
        query: { page: '3', limit: '5' },
      });
      await controller.getCustomerTransactions(req, reply);

      expect(service.getCustomerTransactions).toHaveBeenCalledWith(
        'store-1',
        'cust-1',
        { limit: 5, offset: 10 },
      );
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ page: 3, limit: 5, total: 25, totalPages: 5 }),
        }),
      );
    });
  });

  describe('adjustPoints', () => {
    it('should parse body and adjust points', async () => {
      const tx = { id: 'tx-1', type: 'adjusted', points: 50, balanceAfter: 150 };
      vi.mocked(service.adjustPoints).mockResolvedValue(tx as any);

      const req = createMockRequest({
        body: { customerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', points: 50, description: 'bonus' },
      });
      await controller.adjustPoints(req, reply);

      expect(service.adjustPoints).toHaveBeenCalledWith(
        'store-1',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        50,
        'bonus',
      );
      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith({ success: true, data: tx });
    });

    it('should throw ZodError for invalid body (points = 0)', async () => {
      const req = createMockRequest({
        body: { customerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', points: 0 },
      });

      await expect(controller.adjustPoints(req, reply)).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for non-UUID customerId', async () => {
      const req = createMockRequest({
        body: { customerId: 'not-a-uuid', points: 10 },
      });

      await expect(controller.adjustPoints(req, reply)).rejects.toThrow(ZodError);
    });
  });

  describe('redeemPoints', () => {
    it('should parse body and redeem points', async () => {
      const result = { pointsRedeemed: 50, shekelValue: 5 };
      vi.mocked(service.redeemPoints).mockResolvedValue(result);

      const req = createMockRequest({
        body: { customerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', points: 50 },
      });
      await controller.redeemPoints(req, reply);

      expect(service.redeemPoints).toHaveBeenCalledWith(
        'store-1',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        50,
      );
      expect(reply.send).toHaveBeenCalledWith({ success: true, data: result });
    });

    it('should throw ZodError for negative points', async () => {
      const req = createMockRequest({
        body: { customerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', points: -10 },
      });

      await expect(controller.redeemPoints(req, reply)).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for zero points', async () => {
      const req = createMockRequest({
        body: { customerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', points: 0 },
      });

      await expect(controller.redeemPoints(req, reply)).rejects.toThrow(ZodError);
    });
  });

  describe('getConfig', () => {
    it('should return loyalty config for the store', async () => {
      const config = {
        id: 'cfg-1',
        storeId: 'store-1',
        isActive: true,
        pointsPerShekel: 2,
        pointValue: 0.1,
        minRedeemPoints: 10,
      };
      vi.mocked(service.getConfig).mockResolvedValue(config as any);

      const req = createMockRequest();
      await controller.getConfig(req, reply);

      expect(service.getConfig).toHaveBeenCalledWith('store-1');
      expect(reply.send).toHaveBeenCalledWith({ success: true, data: config });
    });
  });

  describe('updateConfig', () => {
    it('should parse body and update config', async () => {
      const updatedConfig = {
        id: 'cfg-1',
        storeId: 'store-1',
        isActive: true,
        pointsPerShekel: 3,
        pointValue: 0.5,
        minRedeemPoints: 20,
      };
      vi.mocked(service.upsertConfig).mockResolvedValue(updatedConfig as any);

      const req = createMockRequest({
        body: { isActive: true, pointsPerShekel: 3, pointValue: 0.5, minRedeemPoints: 20 },
      });
      await controller.updateConfig(req, reply);

      expect(service.upsertConfig).toHaveBeenCalledWith('store-1', {
        isActive: true,
        pointsPerShekel: 3,
        pointValue: 0.5,
        minRedeemPoints: 20,
      });
      expect(reply.send).toHaveBeenCalledWith({ success: true, data: updatedConfig });
    });

    it('should allow partial config updates', async () => {
      vi.mocked(service.upsertConfig).mockResolvedValue({} as any);

      const req = createMockRequest({ body: { isActive: false } });
      await controller.updateConfig(req, reply);

      expect(service.upsertConfig).toHaveBeenCalledWith('store-1', { isActive: false });
    });

    it('should throw ZodError for invalid pointsPerShekel (negative)', async () => {
      const req = createMockRequest({ body: { pointsPerShekel: -1 } });
      await expect(controller.updateConfig(req, reply)).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for pointsPerShekel exceeding max', async () => {
      const req = createMockRequest({ body: { pointsPerShekel: 1001 } });
      await expect(controller.updateConfig(req, reply)).rejects.toThrow(ZodError);
    });
  });
});
