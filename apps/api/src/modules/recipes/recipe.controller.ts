import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { RecipeService } from './recipe.service.js';

const recipeStepSchema = z.object({
  order: z.number().int().positive().max(1000),
  instruction: z.string().min(1).max(5000),
  duration: z.number().max(100000).optional(),
  notes: z.string().max(2000).optional(),
});

const createRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required').max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  ingredients: z.array(z.object({
    ingredientId: z.string().max(100),
    quantity: z.number().positive().max(1000000),
    unit: z.string().max(50),
  })).max(100),
  subRecipes: z.array(z.object({
    recipeId: z.string().max(100),
    quantity: z.number().positive().max(1000000),
  })).max(20).optional(),
  steps: z.array(recipeStepSchema).min(1).max(200),
  yield: z.number().positive().max(1000000).optional(),
  yieldUnit: z.string().max(50).optional(),
  sellingPrice: z.number().min(0).max(1000000).optional(),
  notes: z.string().max(5000).optional(),
  variations: z.array(z.string().max(1000)).max(20).optional(),
});

const updateRecipeSchema = createRecipeSchema.partial();

export class RecipeController {
  constructor(private recipeService: RecipeService) {}

  async getAll(request: FastifyRequest<{ Querystring: { category?: string; search?: string } }>, reply: FastifyReply) {
    const recipes = await this.recipeService.getAll(request.query);
    return reply.send({ success: true, data: recipes });
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const recipe = await this.recipeService.getById(request.params.id);
    return reply.send({ success: true, data: recipe });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createRecipeSchema.parse(request.body);
    const recipe = await this.recipeService.create(data);
    return reply.status(201).send({ success: true, data: recipe });
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const data = updateRecipeSchema.parse(request.body);
    const recipe = await this.recipeService.update(request.params.id, data);
    return reply.send({ success: true, data: recipe });
  }

  async calculateCost(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const result = await this.recipeService.calculateCost(request.params.id);
    return reply.send({ success: true, data: result });
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await this.recipeService.delete(request.params.id);
    return reply.status(204).send();
  }
}
