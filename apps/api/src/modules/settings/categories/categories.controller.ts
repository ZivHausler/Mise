import type { FastifyRequest, FastifyReply } from 'fastify';
import { CategoriesService } from './categories.service.js';
import { createCategorySchema, updateCategorySchema } from '../settings.schema.js';

export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const categories = await this.categoriesService.listCategories(storeId);
    return reply.send({ success: true, data: categories });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createCategorySchema.parse(request.body);
    const category = await this.categoriesService.createCategory(storeId, data.name, data.nameEn);
    return reply.status(201).send({ success: true, data: category });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    const data = updateCategorySchema.parse(request.body);
    const category = await this.categoriesService.updateCategory(Number(id), storeId, data.name, data.nameEn);
    return reply.send({ success: true, data: category });
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    await this.categoriesService.deleteCategory(Number(id), storeId);
    return reply.status(204).send();
  }
}
