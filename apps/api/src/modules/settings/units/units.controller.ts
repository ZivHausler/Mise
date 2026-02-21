import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnitsService } from './units.service.js';
import { createUnitSchema, updateUnitSchema } from '../settings.types.js';

export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  async listCategories(_request: FastifyRequest, reply: FastifyReply) {
    const categories = await this.unitsService.listCategories();
    return reply.send({ success: true, data: categories });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const units = await this.unitsService.listUnits(storeId);
    return reply.send({ success: true, data: units });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createUnitSchema.parse(request.body);
    const unit = await this.unitsService.createUnit(storeId, data);
    return reply.status(201).send({ success: true, data: unit });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    const data = updateUnitSchema.parse(request.body);
    const unit = await this.unitsService.updateUnit(Number(id), storeId, data);
    return reply.send({ success: true, data: unit });
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    await this.unitsService.deleteUnit(Number(id), storeId);
    return reply.status(204).send();
  }
}
