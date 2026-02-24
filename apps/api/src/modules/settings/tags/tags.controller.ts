import type { FastifyRequest, FastifyReply } from 'fastify';
import { TagsService } from './tags.service.js';
import { createTagSchema, updateTagSchema } from '../settings.schema.js';

export class TagsController {
  constructor(private tagsService: TagsService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const tags = await this.tagsService.listTags(storeId);
    return reply.send({ success: true, data: tags });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createTagSchema.parse(request.body);
    const tag = await this.tagsService.createTag(storeId, data.name);
    return reply.status(201).send({ success: true, data: tag });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    const data = updateTagSchema.parse(request.body);
    const tag = await this.tagsService.updateTag(Number(id), storeId, data.name);
    return reply.send({ success: true, data: tag });
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    await this.tagsService.deleteTag(Number(id), storeId);
    return reply.status(204).send();
  }
}
