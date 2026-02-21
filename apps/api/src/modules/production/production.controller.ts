import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ProductionService } from './production.service.js';
import type { ProductionStage } from './production.types.js';
import {
  getBatchesSchema,
  createBatchSchema,
  generateBatchesSchema,
  updateStageSchema,
  updateBatchSchema,
  splitBatchSchema,
  mergeBatchesSchema,
  prepListDateSchema,
  togglePrepItemSchema,
} from './production.schema.js';

export class ProductionController {
  constructor(private productionService: ProductionService) {}

  async getBatches(request: FastifyRequest<{ Querystring: { date: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { date } = getBatchesSchema.parse(request.query);
    const batches = await this.productionService.getBatchesByDate(storeId, date);
    return reply.send({ success: true, data: batches });
  }

  async getBatchById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const batch = await this.productionService.getBatchById(storeId, Number(request.params.id));
    return reply.send({ success: true, data: batch });
  }

  async generateBatches(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { date } = generateBatchesSchema.parse(request.body);
    const batches = await this.productionService.generateBatches(storeId, date);
    return reply.status(201).send({ success: true, data: batches });
  }

  async createBatch(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createBatchSchema.parse(request.body);
    const batch = await this.productionService.createBatch(storeId, data);
    return reply.status(201).send({ success: true, data: batch });
  }

  async updateStage(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { stage } = updateStageSchema.parse(request.body);
    const batch = await this.productionService.updateStage(storeId, Number(request.params.id), stage as ProductionStage);
    return reply.send({ success: true, data: batch });
  }

  async updateBatch(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateBatchSchema.parse(request.body);
    const batch = await this.productionService.updateBatch(storeId, Number(request.params.id), data);
    return reply.send({ success: true, data: batch });
  }

  async deleteBatch(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.productionService.deleteBatch(storeId, Number(request.params.id));
    return reply.status(204).send();
  }

  async splitBatch(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { splitQuantity } = splitBatchSchema.parse(request.body);
    const result = await this.productionService.splitBatch(storeId, Number(request.params.id), splitQuantity);
    return reply.send({ success: true, data: result });
  }

  async mergeBatches(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { batchIds } = mergeBatchesSchema.parse(request.body);
    const batch = await this.productionService.mergeBatches(storeId, batchIds);
    return reply.send({ success: true, data: batch });
  }

  async getPrepList(request: FastifyRequest<{ Querystring: { date: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { date } = prepListDateSchema.parse(request.query);
    const prepList = await this.productionService.getPrepList(storeId, date);
    return reply.send({ success: true, data: prepList });
  }

  async togglePrepItem(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { isPrepped } = togglePrepItemSchema.parse(request.body);
    const item = await this.productionService.togglePrepItem(storeId, Number(request.params.id), isPrepped);
    return reply.send({ success: true, data: item });
  }

  async getTimeline(request: FastifyRequest<{ Querystring: { date: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { date } = prepListDateSchema.parse(request.query);
    const timeline = await this.productionService.getTimeline(storeId, date);
    return reply.send({ success: true, data: timeline });
  }
}
