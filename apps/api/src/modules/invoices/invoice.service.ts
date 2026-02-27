import type { Invoice, CreateInvoiceDTO, CreateCreditNoteDTO, InvoiceFilters, InvoiceItem } from './invoice.types.js';
import { PgInvoiceRepository } from './invoice.repository.js';
import { PgOrderRepository } from '../orders/order.repository.js';
import { CustomerCrud } from '../customers/customerCrud.js';
import { getPool } from '../../core/database/postgres.js';
import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class InvoiceService {
  async create(storeId: number, userId: number, data: CreateInvoiceDTO): Promise<Invoice> {
    // 1. Check if invoice already exists for this order
    const existing = await PgInvoiceRepository.findExistingInvoice(storeId, data.orderId);
    if (existing) {
      throw new ConflictError('Invoice already exists for this order', ErrorCode.INVOICE_ALREADY_EXISTS);
    }

    // 2. Fetch order
    const order = await PgOrderRepository.findById(storeId, data.orderId);
    if (!order) {
      throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);
    }

    // 3. Fetch store with business fields
    const pool = getPool();
    const storeResult = await pool.query(
      'SELECT id, name, address, phone, email, tax_number, vat_rate FROM stores WHERE id = $1',
      [storeId],
    );
    const store = storeResult.rows[0];
    if (!store) {
      throw new NotFoundError('Store not found', ErrorCode.STORE_NOT_FOUND);
    }

    if (!store['tax_number']) {
      throw new ValidationError('Store must have a tax number configured before issuing invoices', ErrorCode.INVOICE_STORE_MISSING_TAX);
    }

    // 4. Fetch customer
    const customer = order.customer.id ? await CustomerCrud.getById(order.customer.id, storeId) : null;

    // 5. Calculate VAT (Israeli prices include VAT)
    const vatRate = Number(store['vat_rate']);
    const totalAmount = order.totalAmount;
    const subtotal = Number((totalAmount / (1 + vatRate / 100)).toFixed(2));
    const vatAmount = Number((totalAmount - subtotal).toFixed(2));

    // 6. Build items snapshot
    const items: InvoiceItem[] = (order.items || []).map((item: any) => ({
      recipeId: item.recipeId,
      recipeName: item.recipeName || item.recipeId,
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? item.price ?? 0,
      lineTotal: (item.unitPrice ?? item.price ?? 0) * item.quantity,
      notes: item.notes,
    }));

    // 7. Transactional: get next number and insert
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invoiceNumber = await PgInvoiceRepository.getNextNumber(client, storeId, 'invoice');
      const displayNumber = `INV-${String(invoiceNumber).padStart(5, '0')}`;

      const invoice = await PgInvoiceRepository.createInTransaction(client, {
        storeId,
        orderId: data.orderId,
        orderNumber: order.orderNumber ? String(order.orderNumber) : null,
        type: 'invoice',
        invoiceNumber,
        displayNumber,
        originalInvoiceId: null,
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? order.customer.name ?? null,
        customerAddress: customer?.address ?? null,
        customerPhone: customer?.phone ?? null,
        customerEmail: customer?.email ?? null,
        storeName: (store['name'] as string) || null,
        storeAddress: (store['address'] as string) || null,
        storePhone: (store['phone'] as string) || null,
        storeEmail: (store['email'] as string) || null,
        storeTaxNumber: (store['tax_number'] as string) || null,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        items,
        notes: data.notes ?? null,
        issuedBy: userId,
      });

      await client.query('COMMIT');

      getEventBus().publish({
        eventName: EventNames.INVOICE_CREATED,
        payload: { invoiceId: invoice.id, storeId, orderId: data.orderId, displayNumber },
        timestamp: new Date(),
      }).catch(() => {});

      return invoice;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createCreditNote(storeId: number, userId: number, originalInvoiceId: number, data: CreateCreditNoteDTO): Promise<Invoice> {
    // 1. Validate original invoice
    const original = await PgInvoiceRepository.findById(storeId, originalInvoiceId);
    if (!original) {
      throw new NotFoundError('Invoice not found', ErrorCode.INVOICE_NOT_FOUND);
    }
    if (original.type !== 'invoice') {
      throw new ValidationError('Cannot create a credit note for a credit note', ErrorCode.INVOICE_CANNOT_CREDIT_CREDIT);
    }

    // 2. Check no credit note already exists
    const existingCN = await PgInvoiceRepository.findCreditNoteByOriginal(storeId, originalInvoiceId);
    if (existingCN) {
      throw new ConflictError('A credit note already exists for this invoice', ErrorCode.INVOICE_ALREADY_CREDITED);
    }

    // 3. Transactional: get next number and insert credit note with negated amounts
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const creditNumber = await PgInvoiceRepository.getNextNumber(client, storeId, 'credit_note');
      const displayNumber = `CN-${String(creditNumber).padStart(5, '0')}`;

      const creditNote = await PgInvoiceRepository.createInTransaction(client, {
        storeId,
        orderId: original.orderId,
        orderNumber: original.orderNumber,
        type: 'credit_note',
        invoiceNumber: creditNumber,
        displayNumber,
        originalInvoiceId,
        customerId: original.customer.id,
        customerName: original.customer.name,
        customerAddress: original.customer.address,
        customerPhone: original.customer.phone,
        customerEmail: original.customer.email,
        storeName: original.store.name,
        storeAddress: original.store.address,
        storePhone: original.store.phone,
        storeEmail: original.store.email,
        storeTaxNumber: original.store.taxNumber,
        subtotal: -original.pricing.subtotal,
        vatRate: original.pricing.vatRate,
        vatAmount: -original.pricing.vatAmount,
        totalAmount: -original.pricing.totalAmount,
        items: original.items.map((item) => ({
          ...item,
          lineTotal: -item.lineTotal,
        })),
        notes: data.notes ?? null,
        issuedBy: userId,
      });

      await client.query('COMMIT');

      getEventBus().publish({
        eventName: EventNames.CREDIT_NOTE_CREATED,
        payload: { creditNoteId: creditNote.id, originalInvoiceId, storeId, displayNumber },
        timestamp: new Date(),
      }).catch(() => {});

      return creditNote;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getById(storeId: number, id: number): Promise<Invoice> {
    const invoice = await PgInvoiceRepository.findById(storeId, id);
    if (!invoice) {
      throw new NotFoundError('Invoice not found', ErrorCode.INVOICE_NOT_FOUND);
    }
    return invoice;
  }

  async getAll(
    storeId: number,
    options: { limit: number; offset: number },
    filters?: InvoiceFilters,
  ): Promise<{ invoices: Invoice[]; total: number }> {
    return PgInvoiceRepository.findAllPaginated(storeId, options, filters);
  }

  async getByOrderId(storeId: number, orderId: number): Promise<Invoice[]> {
    return PgInvoiceRepository.findByOrderId(storeId, orderId);
  }
}
