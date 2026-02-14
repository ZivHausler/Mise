import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { InventoryService } from './inventory.service.js';

const createIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(50),
  quantity: z.number().min(0).max(1000000),
  costPerUnit: z.number().min(0).max(1000000),
  lowStockThreshold: z.number().min(0).max(1000000),
  supplier: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

const updateIngredientSchema = createIngredientSchema.partial();

const adjustStockSchema = z.object({
  ingredientId: z.string().uuid(),
  type: z.enum(['addition', 'usage', 'adjustment']),
  quantity: z.number().positive().max(1000000),
  reason: z.string().max(500).optional(),
});

export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  async getAll(request: FastifyRequest<{ Querystring: { search?: string } }>, reply: FastifyReply) {
    const ingredients = await this.inventoryService.getAll(request.query.search);
    return reply.send({ success: true, data: ingredients });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const ingredient = await this.inventoryService.getById(request.params.id);
    return reply.send({ success: true, data: ingredient });
  }

  async getLowStock(_request: FastifyRequest, reply: FastifyReply) {
    const ingredients = await this.inventoryService.getLowStock();
    return reply.send({ success: true, data: ingredients });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createIngredientSchema.parse(request.body);
    const ingredient = await this.inventoryService.create(data);
    return reply.status(201).send({ success: true, data: ingredient });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const data = updateIngredientSchema.parse(request.body);
    const ingredient = await this.inventoryService.update(request.params.id, data);
    return reply.send({ success: true, data: ingredient });
  }

  async adjustStock(request: FastifyRequest, reply: FastifyReply) {
    const data = adjustStockSchema.parse(request.body);
    const ingredient = await this.inventoryService.adjustStock(data);
    return reply.send({ success: true, data: ingredient });
  }

  async getLog(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const log = await this.inventoryService.getLog(request.params.id);
    return reply.send({ success: true, data: log });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await this.inventoryService.delete(request.params.id);
    return reply.status(204).send();
  }
}
