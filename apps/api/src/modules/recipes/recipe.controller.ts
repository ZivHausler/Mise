import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RecipeService } from './recipe.service.js';
import { createRecipeSchema, updateRecipeSchema, uploadUrlsSchema, deleteImageSchema } from './recipe.schema.js';
import {
  generateSignedUploadUrl,
  deleteImage,
  validateStoreOwnership,
  isManagedUrl,
} from '../../core/storage/gcs.js';

export class RecipeController {
  constructor(private recipeService: RecipeService) {}

  async getAll(request: FastifyRequest<{ Querystring: { category?: string; search?: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const recipes = await this.recipeService.getAll(storeId, request.query);
    return reply.send({ success: true, data: recipes });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const recipe = await this.recipeService.getById(storeId, request.params.id);
    return reply.send({ success: true, data: recipe });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createRecipeSchema.parse(request.body);
    const recipe = await this.recipeService.create(storeId, data);
    return reply.status(201).send({ success: true, data: recipe });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = updateRecipeSchema.parse(request.body);
    const recipe = await this.recipeService.update(storeId, request.params.id, data);
    return reply.send({ success: true, data: recipe });
  }

  async calculateCost(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const result = await this.recipeService.calculateCost(storeId, request.params.id);
    return reply.send({ success: true, data: result });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    await this.recipeService.delete(storeId, request.params.id);
    return reply.status(204).send();
  }

  async generateUploadUrls(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { count, mimeTypes } = uploadUrlsSchema.parse(request.body);
    if (mimeTypes.length !== count) {
      return reply.status(400).send({ success: false, error: 'mimeTypes length must match count' });
    }
    const slots = await Promise.all(
      mimeTypes.map((mime) => generateSignedUploadUrl(storeId, mime)),
    );
    return reply.send({
      success: true,
      data: {
        slots: slots.map(({ uploadUrl, publicUrl }) => ({ uploadUrl, publicUrl })),
      },
    });
  }

  async deleteImage(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { url } = deleteImageSchema.parse(request.body);
    if (isManagedUrl(url) && !validateStoreOwnership(url, storeId)) {
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }
    await deleteImage(url);
    return reply.send({ success: true });
  }
}
