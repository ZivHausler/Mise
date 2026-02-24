import type { FastifyRequest, FastifyReply } from 'fastify';
import { AllergensService } from './allergens.service.js';
import { createAllergenSchema, updateAllergenSchema } from '../settings.types.js';

export class AllergensController {
  constructor(private allergensService: AllergensService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const allergens = await this.allergensService.listAllergens(storeId);
    return reply.send({ success: true, data: allergens });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createAllergenSchema.parse(request.body);
    const allergen = await this.allergensService.createAllergen(storeId, data);
    return reply.status(201).send({ success: true, data: allergen });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    const data = updateAllergenSchema.parse(request.body);
    const allergen = await this.allergensService.updateAllergen(Number(id), storeId, data);
    return reply.send({ success: true, data: allergen });
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    await this.allergensService.deleteAllergen(Number(id), storeId);
    return reply.status(204).send();
  }
}
