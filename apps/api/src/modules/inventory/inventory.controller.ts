import type { FastifyRequest, FastifyReply } from 'fastify';
import type { InventoryService } from './inventory.service.js';
import { createIngredientSchema, updateIngredientSchema, adjustStockSchema } from './inventory.schema.js';
import { parsePaginationParams } from '../../core/types/pagination.js';
import { pdfQuerySchema } from '../shared/pdf/pdfSchema.js';
import { generateShoppingListPdf } from '../shared/pdf/shoppingListPdf.js';
import { t } from '../shared/pdf/i18n.js';

export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  async getAll(request: FastifyRequest<{ Querystring: { search?: string; page?: string; limit?: string; groupIds?: string; status?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { search, page, limit, groupIds: groupIdsParam, status: statusParam } = request.query;
    if (page || limit) {
      const { page: pageNum, limit: limitNum } = parsePaginationParams(page, limit);
      const groupIds = groupIdsParam ? groupIdsParam.split(',').filter(Boolean) : undefined;
      const statuses = statusParam ? statusParam.split(',').filter(Boolean) : undefined;
      const result = await this.inventoryService.getAllPaginated(storeId, pageNum, limitNum, search, groupIds, statuses);
      return reply.send({ success: true, data: result.items, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
    }
    const ingredients = await this.inventoryService.getAll(storeId, search);
    return reply.send({ success: true, data: ingredients });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const ingredient = await this.inventoryService.getById(storeId, request.params.id);
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
    const ingredient = await this.inventoryService.update(storeId, request.params.id, data);
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
    const log = await this.inventoryService.getLog(storeId, request.params.id);
    return reply.send({ success: true, data: log });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.inventoryService.delete(storeId, request.params.id);
    return reply.status(204).send();
  }
}
