import type { FastifyRequest, FastifyReply } from 'fastify';
import type { InvoiceService } from './invoice.service.js';
import type { InvoiceFilters } from './invoice.types.js';
import { createInvoiceSchema, createCreditNoteSchema, invoiceListQuerySchema } from './invoice.schema.js';
import { parsePaginationParams } from '../../core/types/pagination.js';
import { pdfQuerySchema } from '../shared/pdf/pdfSchema.js';
import { generateInvoicePdf } from '../shared/pdf/invoicePdf.js';
import { t } from '../shared/pdf/i18n.js';

export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const userId = request.currentUser!.userId;
    const data = createInvoiceSchema.parse(request.body);
    const invoice = await this.invoiceService.create(storeId, userId, data);
    return reply.status(201).send({ success: true, data: invoice });
  }

  async createCreditNote(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const userId = request.currentUser!.userId;
    const originalInvoiceId = Number(request.params.id);
    const data = createCreditNoteSchema.parse(request.body);
    const creditNote = await this.invoiceService.createCreditNote(storeId, userId, originalInvoiceId, data);
    return reply.status(201).send({ success: true, data: creditNote });
  }

  async getAll(request: FastifyRequest<{ Querystring: Record<string, string> }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const query = invoiceListQuerySchema.parse(request.query);
    const { page, limit, offset } = parsePaginationParams(query.page, query.limit);
    const filters: InvoiceFilters = {};
    if (query.type) filters.type = query.type;
    if (query.customerId) filters.customerId = query.customerId;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;
    if (query.search) filters.search = query.search;
    const { invoices, total } = await this.invoiceService.getAll(storeId, { limit, offset }, Object.keys(filters).length ? filters : undefined);
    return reply.send({ success: true, data: invoices, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const invoice = await this.invoiceService.getById(storeId, Number(request.params.id));
    return reply.send({ success: true, data: invoice });
  }

  async getPdf(request: FastifyRequest<{ Params: { id: string }; Querystring: { lang?: string; dateFormat?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { lang, dateFormat } = pdfQuerySchema.parse(request.query);
    const invoice = await this.invoiceService.getById(storeId, Number(request.params.id));
    const currency = t(lang, 'common.currency', '\u20AA');

    const pdf = generateInvoicePdf(invoice, { lang, dateFormat, currency });

    const filename = invoice.type === 'credit_note' ? 'credit-note.pdf' : 'invoice.pdf';
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdf);
  }

  async getByOrderId(request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const invoices = await this.invoiceService.getByOrderId(storeId, Number(request.params.orderId));
    return reply.send({ success: true, data: invoices });
  }
}
