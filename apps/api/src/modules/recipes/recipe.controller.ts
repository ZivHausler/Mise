import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RecipeService } from './recipe.service.js';
import { createRecipeSchema, updateRecipeSchema } from './recipe.schema.js';

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
}
