import type { Invoice, InvoiceType, InvoiceItem, InvoiceFilters } from './invoice.types.js';
import { getPool } from '../../core/database/postgres.js';

export class PgInvoiceRepository {
  static async findById(storeId: number, id: number): Promise<Invoice | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND store_id = $2',
      [id, storeId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findByOrderId(storeId: number, orderId: number): Promise<Invoice[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM invoices WHERE store_id = $1 AND order_id = $2 ORDER BY created_at DESC',
      [storeId, orderId],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  static async findExistingInvoice(storeId: number, orderId: number): Promise<Invoice | null> {
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM invoices WHERE store_id = $1 AND order_id = $2 AND type = 'invoice' LIMIT 1",
      [storeId, orderId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findCreditNoteByOriginal(storeId: number, originalInvoiceId: number): Promise<Invoice | null> {
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM invoices WHERE store_id = $1 AND original_invoice_id = $2 AND type = 'credit_note' LIMIT 1",
      [storeId, originalInvoiceId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async findAllPaginated(
    storeId: number,
    options: { limit: number; offset: number },
    filters?: InvoiceFilters,
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const pool = getPool();
    let whereClause = 'WHERE store_id = $1';
    const baseParams: unknown[] = [storeId];
    let idx = 2;

    if (filters?.type) {
      whereClause += ` AND type = $${idx++}`;
      baseParams.push(filters.type);
    }
    if (filters?.customerId) {
      whereClause += ` AND customer_id = $${idx++}`;
      baseParams.push(filters.customerId);
    }
    if (filters?.dateFrom) {
      whereClause += ` AND issued_at >= $${idx++}`;
      baseParams.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      whereClause += ` AND issued_at < ($${idx++}::date + interval '1 day')`;
      baseParams.push(filters.dateTo);
    }
    if (filters?.search) {
      const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
      whereClause += ` AND (display_number ILIKE $${idx} ESCAPE '\\\\' OR customer_name ILIKE $${idx} ESCAPE '\\\\')`;
      baseParams.push(`%${escaped}%`);
      idx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM invoices ${whereClause}`,
      baseParams,
    );
    const total = Number(countResult.rows[0].count);

    const params = [...baseParams];
    let query = `SELECT * FROM invoices ${whereClause} ORDER BY issued_at DESC`;
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(options.limit, options.offset);
    const result = await pool.query(query, params);
    return { invoices: result.rows.map((r: Record<string, unknown>) => this.mapRow(r)), total };
  }

  static async createInTransaction(
    client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
    data: {
      storeId: number;
      orderId: number;
      orderNumber: string | null;
      type: InvoiceType;
      invoiceNumber: number;
      displayNumber: string;
      originalInvoiceId: number | null;
      customerId: number | null;
      customerName: string | null;
      customerAddress: string | null;
      customerPhone: string | null;
      customerEmail: string | null;
      storeName: string | null;
      storeAddress: string | null;
      storePhone: string | null;
      storeEmail: string | null;
      storeTaxNumber: string | null;
      subtotal: number;
      vatRate: number;
      vatAmount: number;
      totalAmount: number;
      items: InvoiceItem[];
      notes: string | null;
      issuedBy: number | null;
    },
  ): Promise<Invoice> {
    const result = await client.query(
      `INSERT INTO invoices (
        store_id, order_id, order_number, type, invoice_number, display_number, original_invoice_id,
        customer_id, customer_name, customer_address, customer_phone, customer_email,
        store_name, store_address, store_phone, store_email, store_tax_number,
        subtotal, vat_rate, vat_amount, total_amount, items, notes, issued_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *`,
      [
        data.storeId, data.orderId, data.orderNumber, data.type, data.invoiceNumber, data.displayNumber, data.originalInvoiceId,
        data.customerId, data.customerName, data.customerAddress, data.customerPhone, data.customerEmail,
        data.storeName, data.storeAddress, data.storePhone, data.storeEmail, data.storeTaxNumber,
        data.subtotal, data.vatRate, data.vatAmount, data.totalAmount, JSON.stringify(data.items), data.notes, data.issuedBy,
      ],
    );
    return this.mapRow(result.rows[0]!);
  }

  static async getNextNumber(
    client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
    storeId: number,
    counterType: InvoiceType,
  ): Promise<number> {
    await client.query(
      'SELECT last_number FROM invoice_counters WHERE store_id = $1 AND counter_type = $2 FOR UPDATE',
      [storeId, counterType],
    );
    const result = await client.query(
      'UPDATE invoice_counters SET last_number = last_number + 1 WHERE store_id = $1 AND counter_type = $2 RETURNING last_number',
      [storeId, counterType],
    );
    return Number(result.rows[0]!['last_number']);
  }

  static async initCounters(storeId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO invoice_counters (store_id, counter_type, last_number)
       VALUES ($1, 'invoice', 0), ($1, 'credit_note', 0)
       ON CONFLICT DO NOTHING`,
      [storeId],
    );
  }

  private static mapRow(row: Record<string, unknown>): Invoice {
    let items: InvoiceItem[] = [];
    const rawItems = row['items'];
    if (typeof rawItems === 'string') {
      items = JSON.parse(rawItems);
    } else if (Array.isArray(rawItems)) {
      items = rawItems as InvoiceItem[];
    }

    return {
      id: Number(row['id']),
      storeId: Number(row['store_id']),
      orderId: Number(row['order_id']),
      orderNumber: (row['order_number'] as string) || null,
      type: row['type'] as InvoiceType,
      invoiceNumber: Number(row['invoice_number']),
      displayNumber: row['display_number'] as string,
      originalInvoiceId: row['original_invoice_id'] != null ? Number(row['original_invoice_id']) : null,
      customer: {
        id: row['customer_id'] != null ? Number(row['customer_id']) : null,
        name: (row['customer_name'] as string) || null,
        address: (row['customer_address'] as string) || null,
        phone: (row['customer_phone'] as string) || null,
        email: (row['customer_email'] as string) || null,
      },
      store: {
        name: (row['store_name'] as string) || null,
        address: (row['store_address'] as string) || null,
        phone: (row['store_phone'] as string) || null,
        email: (row['store_email'] as string) || null,
        taxNumber: (row['store_tax_number'] as string) || null,
      },
      pricing: {
        subtotal: Number(row['subtotal']),
        vatRate: Number(row['vat_rate']),
        vatAmount: Number(row['vat_amount']),
        totalAmount: Number(row['total_amount']),
      },
      items,
      notes: (row['notes'] as string) || null,
      allocationNumber: (row['allocation_number'] as string) || null,
      issuedBy: row['issued_by'] != null ? Number(row['issued_by']) : null,
      issuedAt: new Date(row['issued_at'] as string),
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
