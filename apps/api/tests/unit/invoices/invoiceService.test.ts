import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, ValidationError, ConflictError } from '../../../src/core/errors/app-error.js';
import { createOrder, createCustomer } from '../helpers/mock-factories.js';

// ─── Mocks ─────────────────────────────────────────────────────

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../../../src/modules/invoices/invoice.repository.js', () => ({
  PgInvoiceRepository: {
    findExistingInvoice: vi.fn(),
    findById: vi.fn(),
    findCreditNoteByOriginal: vi.fn(),
    getNextNumber: vi.fn(),
    createInTransaction: vi.fn(),
    findAllPaginated: vi.fn(),
    findByOrderId: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  PgOrderRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: {
    getById: vi.fn(),
  },
}));

vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: vi.fn(() => ({
    query: vi.fn(),
    connect: vi.fn(() => mockClient),
  })),
}));

vi.mock('../../../src/core/events/event-bus.js', () => ({
  getEventBus: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { PgInvoiceRepository } from '../../../src/modules/invoices/invoice.repository.js';
import { PgOrderRepository } from '../../../src/modules/orders/order.repository.js';
import { CustomerCrud } from '../../../src/modules/customers/customerCrud.js';
import { getPool } from '../../../src/core/database/postgres.js';
import { InvoiceService } from '../../../src/modules/invoices/invoice.service.js';
import type { Invoice } from '../../../src/modules/invoices/invoice.types.js';

const STORE_ID = 1;
const USER_ID = 1;

function createInvoice(overrides?: Partial<Invoice>): Invoice {
  return {
    id: 1,
    storeId: STORE_ID,
    orderId: 1,
    orderNumber: '100000001',
    type: 'invoice',
    invoiceNumber: 1,
    displayNumber: 'INV-00001',
    originalInvoiceId: null,
    customer: { id: 1, name: 'Jane Doe', address: null, phone: '054-1234567', email: 'jane@example.com' },
    store: { name: 'Test Bakery', address: '123 Street', phone: '03-1234567', email: 'store@test.com', taxNumber: '123456789' },
    pricing: { subtotal: 85.47, vatRate: 17, vatAmount: 14.53, totalAmount: 100 },
    items: [{ recipeId: 'recipe-1', recipeName: 'Chocolate Cake', quantity: 2, unitPrice: 50, lineTotal: 100 }],
    notes: null,
    allocationNumber: null,
    issuedBy: USER_ID,
    issuedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockResolvedValue({ rows: [] });
    mockClient.release.mockReturnValue(undefined);
    service = new InvoiceService();
  });

  // ─── create ────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw ConflictError when invoice already exists for order', async () => {
      vi.mocked(PgInvoiceRepository.findExistingInvoice).mockResolvedValue(createInvoice());

      await expect(service.create(STORE_ID, USER_ID, { orderId: 1 })).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError when order does not exist', async () => {
      vi.mocked(PgInvoiceRepository.findExistingInvoice).mockResolvedValue(null);
      vi.mocked(PgOrderRepository.findById).mockResolvedValue(null);

      await expect(service.create(STORE_ID, USER_ID, { orderId: 999 })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when store does not exist', async () => {
      vi.mocked(PgInvoiceRepository.findExistingInvoice).mockResolvedValue(null);
      vi.mocked(PgOrderRepository.findById).mockResolvedValue(createOrder());
      vi.mocked(getPool).mockReturnValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn(() => mockClient),
      } as any);

      await expect(service.create(STORE_ID, USER_ID, { orderId: 1 })).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when store has no tax number', async () => {
      vi.mocked(PgInvoiceRepository.findExistingInvoice).mockResolvedValue(null);
      vi.mocked(PgOrderRepository.findById).mockResolvedValue(createOrder());
      vi.mocked(getPool).mockReturnValue({
        query: vi.fn().mockResolvedValue({ rows: [{ id: 1, name: 'Bakery', tax_number: null, vat_rate: 17 }] }),
        connect: vi.fn(() => mockClient),
      } as any);

      await expect(service.create(STORE_ID, USER_ID, { orderId: 1 })).rejects.toThrow(ValidationError);
    });

    it('should create invoice with correct VAT calculation', async () => {
      const order = createOrder({ totalAmount: 117 });
      const invoice = createInvoice({ pricing: { subtotal: 100, vatRate: 17, vatAmount: 17, totalAmount: 117 } });

      vi.mocked(PgInvoiceRepository.findExistingInvoice).mockResolvedValue(null);
      vi.mocked(PgOrderRepository.findById).mockResolvedValue(order);
      vi.mocked(getPool).mockReturnValue({
        query: vi.fn().mockResolvedValue({ rows: [{ id: 1, name: 'Bakery', tax_number: '123', vat_rate: 17, address: null, phone: null, email: null }] }),
        connect: vi.fn(() => mockClient),
      } as any);
      vi.mocked(CustomerCrud.getById).mockResolvedValue(createCustomer());
      vi.mocked(PgInvoiceRepository.getNextNumber).mockResolvedValue(1);
      vi.mocked(PgInvoiceRepository.createInTransaction).mockResolvedValue(invoice);

      const result = await service.create(STORE_ID, USER_ID, { orderId: 1 });
      expect(result).toEqual(invoice);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on transaction error', async () => {
      vi.mocked(PgInvoiceRepository.findExistingInvoice).mockResolvedValue(null);
      vi.mocked(PgOrderRepository.findById).mockResolvedValue(createOrder());
      vi.mocked(getPool).mockReturnValue({
        query: vi.fn().mockResolvedValue({ rows: [{ id: 1, name: 'Bakery', tax_number: '123', vat_rate: 17, address: null, phone: null, email: null }] }),
        connect: vi.fn(() => mockClient),
      } as any);
      vi.mocked(CustomerCrud.getById).mockResolvedValue(createCustomer());
      vi.mocked(PgInvoiceRepository.getNextNumber).mockRejectedValue(new Error('DB error'));

      await expect(service.create(STORE_ID, USER_ID, { orderId: 1 })).rejects.toThrow('DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should generate correct display number with zero-padding', async () => {
      vi.mocked(PgInvoiceRepository.findExistingInvoice).mockResolvedValue(null);
      vi.mocked(PgOrderRepository.findById).mockResolvedValue(createOrder());
      vi.mocked(getPool).mockReturnValue({
        query: vi.fn().mockResolvedValue({ rows: [{ id: 1, name: 'Bakery', tax_number: '123', vat_rate: 17, address: null, phone: null, email: null }] }),
        connect: vi.fn(() => mockClient),
      } as any);
      vi.mocked(CustomerCrud.getById).mockResolvedValue(null);
      vi.mocked(PgInvoiceRepository.getNextNumber).mockResolvedValue(42);
      vi.mocked(PgInvoiceRepository.createInTransaction).mockImplementation(async (_client, data) => {
        expect(data.displayNumber).toBe('INV-00042');
        return createInvoice({ displayNumber: 'INV-00042', invoiceNumber: 42 });
      });

      await service.create(STORE_ID, USER_ID, { orderId: 1 });
    });
  });

  // ─── createCreditNote ──────────────────────────────────────────

  describe('createCreditNote', () => {
    it('should throw NotFoundError when original invoice not found', async () => {
      vi.mocked(PgInvoiceRepository.findById).mockResolvedValue(null);

      await expect(service.createCreditNote(STORE_ID, USER_ID, 999, {})).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when trying to credit a credit note', async () => {
      vi.mocked(PgInvoiceRepository.findById).mockResolvedValue(createInvoice({ type: 'credit_note' }));

      await expect(service.createCreditNote(STORE_ID, USER_ID, 1, {})).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when credit note already exists', async () => {
      vi.mocked(PgInvoiceRepository.findById).mockResolvedValue(createInvoice());
      vi.mocked(PgInvoiceRepository.findCreditNoteByOriginal).mockResolvedValue(createInvoice({ type: 'credit_note' }));

      await expect(service.createCreditNote(STORE_ID, USER_ID, 1, {})).rejects.toThrow(ConflictError);
    });

    it('should create credit note with negated amounts', async () => {
      const original = createInvoice({
        pricing: { subtotal: 100, vatRate: 17, vatAmount: 17, totalAmount: 117 },
        items: [{ recipeId: 'r1', recipeName: 'Cake', quantity: 2, unitPrice: 58.5, lineTotal: 117 }],
      });
      const creditNote = createInvoice({ type: 'credit_note', displayNumber: 'CN-00001' });

      vi.mocked(PgInvoiceRepository.findById).mockResolvedValue(original);
      vi.mocked(PgInvoiceRepository.findCreditNoteByOriginal).mockResolvedValue(null);
      vi.mocked(PgInvoiceRepository.getNextNumber).mockResolvedValue(1);
      vi.mocked(PgInvoiceRepository.createInTransaction).mockImplementation(async (_client, data) => {
        // Verify amounts are negated
        expect(data.subtotal).toBe(-100);
        expect(data.vatAmount).toBe(-17);
        expect(data.totalAmount).toBe(-117);
        expect(data.items[0].lineTotal).toBe(-117);
        expect(data.displayNumber).toBe('CN-00001');
        return creditNote;
      });

      const result = await service.createCreditNote(STORE_ID, USER_ID, 1, { notes: 'Returned' });
      expect(result.type).toBe('credit_note');
    });

    it('should rollback credit note transaction on error', async () => {
      vi.mocked(PgInvoiceRepository.findById).mockResolvedValue(createInvoice());
      vi.mocked(PgInvoiceRepository.findCreditNoteByOriginal).mockResolvedValue(null);
      vi.mocked(PgInvoiceRepository.getNextNumber).mockRejectedValue(new Error('DB fail'));

      await expect(service.createCreditNote(STORE_ID, USER_ID, 1, {})).rejects.toThrow('DB fail');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ─── getById ───────────────────────────────────────────────────

  describe('getById', () => {
    it('should return invoice when found', async () => {
      const invoice = createInvoice();
      vi.mocked(PgInvoiceRepository.findById).mockResolvedValue(invoice);

      const result = await service.getById(STORE_ID, 1);
      expect(result).toEqual(invoice);
    });

    it('should throw NotFoundError when invoice not found', async () => {
      vi.mocked(PgInvoiceRepository.findById).mockResolvedValue(null);

      await expect(service.getById(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── getAll ────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should return paginated invoices', async () => {
      const data = { invoices: [createInvoice()], total: 1 };
      vi.mocked(PgInvoiceRepository.findAllPaginated).mockResolvedValue(data);

      const result = await service.getAll(STORE_ID, { limit: 10, offset: 0 });
      expect(result.invoices).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should pass filters through', async () => {
      vi.mocked(PgInvoiceRepository.findAllPaginated).mockResolvedValue({ invoices: [], total: 0 });
      const filters = { type: 'credit_note' as const, customerId: 5 };

      await service.getAll(STORE_ID, { limit: 10, offset: 0 }, filters);
      expect(PgInvoiceRepository.findAllPaginated).toHaveBeenCalledWith(STORE_ID, { limit: 10, offset: 0 }, filters);
    });
  });

  // ─── getByOrderId ──────────────────────────────────────────────

  describe('getByOrderId', () => {
    it('should return invoices for an order', async () => {
      const invoices = [createInvoice()];
      vi.mocked(PgInvoiceRepository.findByOrderId).mockResolvedValue(invoices);

      const result = await service.getByOrderId(STORE_ID, 1);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no invoices exist', async () => {
      vi.mocked(PgInvoiceRepository.findByOrderId).mockResolvedValue([]);

      const result = await service.getByOrderId(STORE_ID, 1);
      expect(result).toHaveLength(0);
    });
  });
});
