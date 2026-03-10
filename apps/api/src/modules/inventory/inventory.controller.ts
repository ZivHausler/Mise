import type { FastifyRequest, FastifyReply } from 'fastify';
import type { InventoryService } from './inventory.service.js';
import type { ReceiptScannerService } from './receipt-scanner.service.js';
import { createIngredientSchema, updateIngredientSchema, adjustStockSchema, bulkAdjustSchema, bulkDeleteSchema } from './inventory.schema.js';
import { parsePaginationParams } from '../../core/types/pagination.js';
import { pdfQuerySchema } from '../shared/pdf/pdfSchema.js';
import { generateShoppingListPdf } from '../shared/pdf/shoppingListPdf.js';
import { t } from '../shared/pdf/i18n.js';
import { ValidationError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private receiptScannerService?: ReceiptScannerService,
  ) {}

  async getAll(request: FastifyRequest<{ Querystring: { search?: string; page?: string; limit?: string; allergenIds?: string; status?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { search, page, limit, allergenIds: allergenIdsParam, status: statusParam } = request.query;
    if (page || limit) {
      const { page: pageNum, limit: limitNum } = parsePaginationParams(page, limit);
      const allergenIds = allergenIdsParam ? allergenIdsParam.split(',').filter(Boolean).map(Number) : undefined;
      const statuses = statusParam ? statusParam.split(',').filter(Boolean) : undefined;
      const result = await this.inventoryService.getAllPaginated(storeId, pageNum, limitNum, search, allergenIds, statuses);
      return reply.send({ success: true, data: result.items, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
    }
    const ingredients = await this.inventoryService.getAll(storeId, search);
    return reply.send({ success: true, data: ingredients });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const ingredient = await this.inventoryService.getById(storeId, Number(request.params.id));
    return reply.send({ success: true, data: ingredient });
  }

  async getLowStock(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const ingredients = await this.inventoryService.getLowStock(storeId);
    return reply.send({ success: true, data: ingredients });
  }

  async getShoppingListPdf(request: FastifyRequest<{ Querystring: { lang?: string; dateFormat?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { lang, dateFormat } = pdfQuerySchema.parse(request.query);

    const items = await this.inventoryService.getLowStock(storeId);
    const currency = t(lang, 'common.currency', '\u20AA');

    const pdf = generateShoppingListPdf(items, { lang, dateFormat, currency });
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'attachment; filename="shopping-list.pdf"')
      .send(pdf);
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createIngredientSchema.parse(request.body);
    const ingredient = await this.inventoryService.create(storeId, data);
    return reply.status(201).send({ success: true, data: ingredient });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateIngredientSchema.parse(request.body);
    const ingredient = await this.inventoryService.update(storeId, Number(request.params.id), data);
    return reply.send({ success: true, data: ingredient });
  }

  async adjustStock(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = adjustStockSchema.parse(request.body);
    const ingredient = await this.inventoryService.adjustStock(storeId, data, request.id);
    return reply.send({ success: true, data: ingredient });
  }

  async getLog(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const log = await this.inventoryService.getLog(storeId, Number(request.params.id));
    return reply.send({ success: true, data: log });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.inventoryService.delete(storeId, Number(request.params.id));
    return reply.status(204).send();
  }

  async scanReceipt(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;

    const file = await request.file();
    if (!file) {
      throw new ValidationError('No file uploaded', ErrorCode.VALIDATION_ERROR);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const buffer = await file.toBuffer();
    if (buffer.length > MAX_FILE_SIZE) {
      throw new ValidationError('File too large. Maximum size is 5MB', ErrorCode.VALIDATION_ERROR);
    }

    const result = await this.receiptScannerService!.scanReceipt(storeId, buffer, file.mimetype);
    return reply.send({ success: true, data: result });
  }

  async adjustBulk(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { adjustments } = bulkAdjustSchema.parse(request.body);
    const result = await this.inventoryService.adjustBulk(storeId, adjustments, request.id);
    return reply.send({ success: true, data: result });
  }

  async deleteBulk(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { ingredientIds } = bulkDeleteSchema.parse(request.body);
    const result = await this.inventoryService.deleteBulk(storeId, ingredientIds);
    return reply.send({ success: true, data: result });
  }
}
