import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerService } from '../../../src/modules/customers/customer.service.js';
import { createCustomer } from '../helpers/mock-factories.js';

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    findByPhone: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: {
    countActiveByCustomer: vi.fn(),
  },
}));

vi.mock('../../../src/modules/customers/customer.repository.js', () => ({
  PgCustomerRepository: {
    findAllWithSegment: vi.fn(),
  },
}));

vi.mock('../../../src/modules/loyalty/loyalty.service.js', () => ({
  LoyaltyService: vi.fn().mockImplementation(() => ({
    getFullConfig: vi.fn(),
  })),
}));

import { CustomerCrud } from '../../../src/modules/customers/customerCrud.js';
import { PgCustomerRepository } from '../../../src/modules/customers/customer.repository.js';
import { LoyaltyService } from '../../../src/modules/loyalty/loyalty.service.js';
import type { LoyaltyConfig } from '../../../src/modules/loyalty/loyalty.types.js';

const STORE_ID = 1;

function makeFullConfig(overrides: Partial<LoyaltyConfig> = {}): LoyaltyConfig {
  return {
    id: 1,
    storeId: STORE_ID,
    isActive: true,
    pointsPerShekel: 1,
    pointValue: 0.1,
    minRedeemPoints: 0,
    segmentVipOrderCount: 10,
    segmentVipDays: 90,
    segmentRegularOrderCount: 3,
    segmentRegularDays: 90,
    segmentNewDays: 30,
    segmentDormantDays: 60,
    birthdayReminderDays: 7,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('CustomerService - Segment Filter', () => {
  let service: CustomerService;
  let mockLoyaltyGetFullConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomerService();

    // Get reference to the mock getFullConfig
    mockLoyaltyGetFullConfig = vi.fn();
    vi.mocked(LoyaltyService).mockImplementation(() => ({
      getFullConfig: mockLoyaltyGetFullConfig,
    }) as any);
    // Re-create service after re-mocking
    service = new CustomerService();
  });

  describe('getAll with segment filter', () => {
    it('should use CustomerCrud.getAll when no segment filter', async () => {
      const customers = [createCustomer({ id: 1 }), createCustomer({ id: 2 })];
      vi.mocked(CustomerCrud.getAll).mockResolvedValue(customers);

      const result = await service.getAll(STORE_ID);

      expect(CustomerCrud.getAll).toHaveBeenCalledWith(STORE_ID, undefined);
      expect(PgCustomerRepository.findAllWithSegment).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should use CustomerCrud.getAll when segment is undefined', async () => {
      vi.mocked(CustomerCrud.getAll).mockResolvedValue([]);

      await service.getAll(STORE_ID, 'search', undefined);

      expect(CustomerCrud.getAll).toHaveBeenCalledWith(STORE_ID, 'search');
      expect(PgCustomerRepository.findAllWithSegment).not.toHaveBeenCalled();
    });

    it('should use findAllWithSegment when segment filter is provided', async () => {
      const config = makeFullConfig();
      mockLoyaltyGetFullConfig.mockResolvedValue(config);
      const customers = [createCustomer({ id: 1 })];
      vi.mocked(PgCustomerRepository.findAllWithSegment).mockResolvedValue(customers);

      const result = await service.getAll(STORE_ID, undefined, 'vip');

      expect(PgCustomerRepository.findAllWithSegment).toHaveBeenCalledWith(STORE_ID, config, 'vip', undefined);
      expect(CustomerCrud.getAll).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should pass both search and segment to findAllWithSegment', async () => {
      const config = makeFullConfig();
      mockLoyaltyGetFullConfig.mockResolvedValue(config);
      vi.mocked(PgCustomerRepository.findAllWithSegment).mockResolvedValue([]);

      await service.getAll(STORE_ID, 'alice', 'regular');

      expect(PgCustomerRepository.findAllWithSegment).toHaveBeenCalledWith(STORE_ID, config, 'regular', 'alice');
    });

    it('should fetch loyalty config before calling findAllWithSegment', async () => {
      const config = makeFullConfig({ segmentVipOrderCount: 20 });
      mockLoyaltyGetFullConfig.mockResolvedValue(config);
      vi.mocked(PgCustomerRepository.findAllWithSegment).mockResolvedValue([]);

      await service.getAll(STORE_ID, undefined, 'dormant');

      expect(mockLoyaltyGetFullConfig).toHaveBeenCalledWith(STORE_ID);
      expect(PgCustomerRepository.findAllWithSegment).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ segmentVipOrderCount: 20 }),
        'dormant',
        undefined,
      );
    });

    it('should return empty array when no customers match the segment', async () => {
      mockLoyaltyGetFullConfig.mockResolvedValue(makeFullConfig());
      vi.mocked(PgCustomerRepository.findAllWithSegment).mockResolvedValue([]);

      const result = await service.getAll(STORE_ID, undefined, 'vip');

      expect(result).toEqual([]);
    });

    it('should handle "new" segment filter', async () => {
      mockLoyaltyGetFullConfig.mockResolvedValue(makeFullConfig());
      vi.mocked(PgCustomerRepository.findAllWithSegment).mockResolvedValue([createCustomer()]);

      const result = await service.getAll(STORE_ID, undefined, 'new');

      expect(PgCustomerRepository.findAllWithSegment).toHaveBeenCalledWith(
        STORE_ID,
        expect.any(Object),
        'new',
        undefined,
      );
      expect(result).toHaveLength(1);
    });

    it('should handle "inactive" segment filter', async () => {
      mockLoyaltyGetFullConfig.mockResolvedValue(makeFullConfig());
      vi.mocked(PgCustomerRepository.findAllWithSegment).mockResolvedValue([]);

      await service.getAll(STORE_ID, undefined, 'inactive');

      expect(PgCustomerRepository.findAllWithSegment).toHaveBeenCalledWith(
        STORE_ID,
        expect.any(Object),
        'inactive',
        undefined,
      );
    });
  });
});
